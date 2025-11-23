/*
 * Tracked ERC-20 Token Balance Handler
 * Tracks token balances for HENLO and HENLOCKED tier tokens
 * Used for CubQuests mission verification (holdToken action)
 */

import { TrackedTokenBalance, TrackedErc20 } from "generated";
import { TRACKED_ERC20_TOKEN_KEYS } from "./tracked-erc20/constants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Handles ERC-20 Transfer events for tracked tokens
 * Updates TrackedTokenBalance records for both sender and receiver
 */
export const handleTrackedErc20Transfer = TrackedErc20.Transfer.handler(
  async ({ event, context }) => {
    const { from, to, value } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;
    const tokenAddress = event.srcAddress.toLowerCase();

    // Get token key from address
    const tokenKey = TRACKED_ERC20_TOKEN_KEYS[tokenAddress];
    if (!tokenKey) {
      // Token not in our tracked list, skip
      return;
    }

    // Normalize addresses
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    const zeroAddress = ZERO_ADDRESS.toLowerCase();

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
);
