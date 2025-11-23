/*
 * HenloVault Mint Event Handler
 * Tracks initial HENLOCKED token mints from the HenloVault
 * This captures the initial token distribution that isn't emitted as standard ERC-20 Transfer events
 */

import { TrackedTokenBalance, HenloVault } from "generated";

// Map strike values to HENLOCKED token addresses and keys
// Strike represents FDV target in thousands (e.g., 100000 = $100M FDV)
const STRIKE_TO_TOKEN: Record<string, { address: string; key: string }> = {
  "100000": {
    address: "0x7bdf98ddeed209cfa26bd2352b470ac8b5485ec5",
    key: "hlkd100m",
  },
  "330000": {
    address: "0x37dd8850919ebdca911c383211a70839a94b0539",
    key: "hlkd330m",
  },
  "420000": {
    address: "0xf07fa3ece9741d408d643748ff85710bedef25ba",
    key: "hlkd420m",
  },
  "690000": {
    address: "0x8ab854dc0672d7a13a85399a56cb628fb22102d6",
    key: "hlkd690m",
  },
  "1000000": {
    address: "0xf0edfc3e122db34773293e0e5b2c3a58492e7338",
    key: "hlkd1b",
  },
};

/**
 * Handles HenloVault Mint events
 * Creates/updates TrackedTokenBalance for the user when they receive HENLOCKED tokens
 */
export const handleHenloVaultMint = HenloVault.Mint.handler(
  async ({ event, context }) => {
    const { user, strike, amount } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const chainId = event.chainId;

    // Get token info from strike value
    const strikeKey = strike.toString();
    const tokenInfo = STRIKE_TO_TOKEN[strikeKey];

    if (!tokenInfo) {
      // Unknown strike value, skip
      context.log.warn(`Unknown HenloVault strike value: ${strikeKey}`);
      return;
    }

    const { address: tokenAddress, key: tokenKey } = tokenInfo;
    const userLower = user.toLowerCase();

    // Create or update TrackedTokenBalance
    const balanceId = `${userLower}_${tokenAddress}_${chainId}`;
    const existingBalance = await context.TrackedTokenBalance.get(balanceId);

    if (existingBalance) {
      // Add to existing balance
      const updatedBalance: TrackedTokenBalance = {
        ...existingBalance,
        balance: existingBalance.balance + amount,
        lastUpdated: timestamp,
      };
      context.TrackedTokenBalance.set(updatedBalance);
    } else {
      // Create new balance record
      const newBalance: TrackedTokenBalance = {
        id: balanceId,
        address: userLower,
        tokenAddress,
        tokenKey,
        chainId,
        balance: amount,
        lastUpdated: timestamp,
      };
      context.TrackedTokenBalance.set(newBalance);
    }
  }
);
