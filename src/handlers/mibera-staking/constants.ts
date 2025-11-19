/**
 * Mibera NFT staking contract addresses and mappings
 */

// Staking contract addresses (lowercase)
export const PADDLEFI_VAULT = "0x242b7126f3c4e4f8cbd7f62571293e63e9b0a4e1";
export const JIKO_STAKING = "0x8778ca41cf0b5cd2f9967ae06b691daff11db246";

// Map contract addresses to human-readable keys
export const STAKING_CONTRACT_KEYS: Record<string, string> = {
  [PADDLEFI_VAULT]: "paddlefi",
  [JIKO_STAKING]: "jiko",
};

// Reverse mapping for lookups
export const STAKING_CONTRACT_ADDRESSES: Record<string, string> = {
  paddlefi: PADDLEFI_VAULT,
  jiko: JIKO_STAKING,
};
