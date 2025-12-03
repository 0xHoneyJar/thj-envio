/*
 * NFT Marketplace contract addresses for secondary sale detection
 *
 * These addresses are used to identify when a transfer goes through
 * a known marketplace (vs direct transfer or airdrop).
 */

// Seaport Protocol (used by OpenSea, Magic Eden, and others)
// These are cross-chain addresses (same on all EVM chains)
export const SEAPORT_ADDRESSES = new Set([
  "0x00000000006c3852cbef3e08e8df289169ede581", // Seaport 1.1
  "0x00000000000001ad428e4906ae43d8f9852d0dd6", // Seaport 1.4
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc", // Seaport 1.5
  "0x0000000000000068f116a894984e2db1123eb395", // Seaport 1.6
]);

/**
 * Check if an address is a known marketplace operator/contract
 */
export function isMarketplaceAddress(address: string): boolean {
  return SEAPORT_ADDRESSES.has(address.toLowerCase());
}
