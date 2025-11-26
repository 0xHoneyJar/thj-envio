/*
 * Unified ERC-20 Token Handler
 * Tracks token balances for HENLO and HENLOCKED tier tokens
 * Also handles burn tracking and holder stats for HENLO token
 */

import { TrackedTokenBalance, TrackedErc20 } from "generated";
import { TOKEN_CONFIGS } from "./tracked-erc20/token-config";
import { isBurnTransfer, trackBurn, ZERO_ADDRESS } from "./tracked-erc20/burn-tracking";
import { updateHolderBalances, updateHolderStats } from "./tracked-erc20/holder-stats";

/**
 * Handles ERC-20 Transfer events for tracked tokens
 * Routes to appropriate feature handlers based on token config
 */
export const handleTrackedErc20Transfer = TrackedErc20.Transfer.handler(
  async ({ event, context }) => {
    const { from, to, value } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const tokenAddress = event.srcAddress.toLowerCase();

    // Get token config from address
    const config = TOKEN_CONFIGS[tokenAddress];
    if (!config) {
      // Token not in our tracked list, skip
      return;
    }

    // Normalize addresses
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    const zeroAddress = ZERO_ADDRESS.toLowerCase();

    // 1. Balance tracking (ALL tokens)
    await updateBalance(
      context,
      tokenAddress,
      config.key,
      chainId,
      fromLower,
      toLower,
      value,
      timestamp,
      zeroAddress
    );

    // 2. Holder stats (if enabled - HENLO only)
    if (config.holderStats) {
      try {
        const { holderDelta, supplyDelta } = await updateHolderBalances(event, context, config);

        // Update holder statistics if there were changes
        if (holderDelta !== 0 || supplyDelta !== BigInt(0)) {
          await updateHolderStats(context, chainId, holderDelta, supplyDelta, timestamp);
        }
      } catch (error) {
        console.error('[TrackedErc20] Holder stats error:', tokenAddress, error);
      }
    }

    // 3. Burn tracking (if enabled + is burn)
    if (config.burnTracking && isBurnTransfer(toLower)) {
      try {
        await trackBurn(event, context, config, fromLower, toLower);
      } catch (error) {
        console.error('[TrackedErc20] Burn tracking error:', tokenAddress, error);
      }
    }
  }
);

/**
 * Updates TrackedTokenBalance records for sender and receiver
 */
async function updateBalance(
  context: any,
  tokenAddress: string,
  tokenKey: string,
  chainId: number,
  fromLower: string,
  toLower: string,
  value: bigint,
  timestamp: bigint,
  zeroAddress: string
) {
  // Handle sender (decrease balance) - skip if mint (from zero address)
  if (fromLower !== zeroAddress) {
    const fromId = `${fromLower}_${tokenAddress}_${chainId}`;
    const fromBalance = await context.TrackedTokenBalance.get(fromId);

    if (fromBalance) {
      const newBalance = fromBalance.balance - value;
      const updatedFromBalance: TrackedTokenBalance = {
        ...fromBalance,
        balance: newBalance,
        lastUpdated: timestamp,
      };
      context.TrackedTokenBalance.set(updatedFromBalance);
    } else {
      // Create record with negative balance (shouldn't happen in practice)
      const newFromBalance: TrackedTokenBalance = {
        id: fromId,
        address: fromLower,
        tokenAddress,
        tokenKey,
        chainId,
        balance: -value,
        lastUpdated: timestamp,
      };
      context.TrackedTokenBalance.set(newFromBalance);
    }
  }

  // Handle receiver (increase balance) - skip if burn (to zero address)
  // Note: We still track burns in TrackedTokenBalance for completeness
  if (toLower !== zeroAddress) {
    const toId = `${toLower}_${tokenAddress}_${chainId}`;
    const toBalance = await context.TrackedTokenBalance.get(toId);

    if (toBalance) {
      const newBalance = toBalance.balance + value;
      const updatedToBalance: TrackedTokenBalance = {
        ...toBalance,
        balance: newBalance,
        lastUpdated: timestamp,
      };
      context.TrackedTokenBalance.set(updatedToBalance);
    } else {
      // Create new record for first-time holder
      const newToBalance: TrackedTokenBalance = {
        id: toId,
        address: toLower,
        tokenAddress,
        tokenKey,
        chainId,
        balance: value,
        lastUpdated: timestamp,
      };
      context.TrackedTokenBalance.set(newToBalance);
    }
  }
}
