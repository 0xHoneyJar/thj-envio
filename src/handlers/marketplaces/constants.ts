/*
 * NFT Marketplace contract addresses for secondary sale detection
 *
 * These addresses are used to identify when a transfer goes through
 * a known marketplace (vs direct transfer or airdrop).
 *
 * Note: Most of these are cross-chain (same address on all EVM chains).
 * Chain-specific addresses are noted where applicable.
 */

// All known marketplace addresses in a single Set for efficient lookup
export const MARKETPLACE_ADDRESSES = new Set([
  // ============ OpenSea / Seaport Protocol ============
  // Seaport is used by OpenSea, Magic Eden, and others
  "0x00000000006c3852cbef3e08e8df289169ede581", // Seaport 1.1
  "0x00000000000001ad428e4906ae43d8f9852d0dd6", // Seaport 1.4
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc", // Seaport 1.5
  "0x0000000000000068f116a894984e2db1123eb395", // Seaport 1.6
  "0x1e0049783f008a0085193e00003d00cd54003c71", // OpenSea Conduit (handles token transfers)

  // ============ Blur ============
  "0x000000000000ad05ccc4f10045630fb830b95127", // Blur: Marketplace
  "0x39da41747a83aee658334415666f3ef92dd0d541", // Blur: Marketplace 2 (BlurSwap)
  "0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5", // Blur: Marketplace 3
  "0x29469395eaf6f95920e59f858042f0e28d98a20b", // Blur: Blend (Lending/NFT-backed loans)

  // ============ LooksRare ============
  "0x59728544b08ab483533076417fbbb2fd0b17ce3a", // LooksRare: Exchange
  "0x0000000000e655fae4d56241588680f86e3b2377", // LooksRare: Exchange V2

  // ============ X2Y2 ============
  "0x6d7812d41a08bc2a910b562d8b56411964a4ed88", // X2Y2: Main Exchange (X2Y2_r1)
  "0x74312363e45dcaba76c59ec49a7aa8a65a67eed3", // X2Y2: Exchange Proxy

  // ============ Rarible ============
  "0xcd4ec7b66fbc029c116ba9ffb3e59351c20b5b06", // Rarible: Exchange V1
  "0x9757f2d2b135150bbeb65308d4a91804107cd8d6", // Rarible: Exchange V2

  // ============ Foundation ============
  "0xcda72070e455bb31c7690a170224ce43623d0b6f", // Foundation: Market

  // ============ SuperRare ============
  "0x65b49f7aee40347f5a90b714be4ef086f3fe5e2c", // SuperRare: Bazaar
  "0x8c9f364bf7a56ed058fc63ef81c6cf09c833e656", // SuperRare: Marketplace

  // ============ Zora ============
  "0x76744367ae5a056381868f716bdf0b13ae1aeaa3", // Zora: Module Manager
  "0x6170b3c3a54c3d8c854934cbc314ed479b2b29a3", // Zora: Asks V1.1

  // ============ NFTX ============
  "0x0fc584529a2aefa997697fafacba5831fac0c22d", // NFTX: Marketplace Zap

  // ============ Sudoswap ============
  "0x2b2e8cda09bba9660dca5cb6233787738ad68329", // Sudoswap: LSSVMPairFactory
  "0xa020d57ab0448ef74115c112d18a9c231cc86000", // Sudoswap: LSSVMRouter

  // ============ Gem / Genie (Aggregators, now part of OpenSea/Uniswap) ============
  "0x83c8f28c26bf6aaca652df1dbbe0e1b56f8baba2", // Gem: Swap
  "0x0000000035634b55f3d99b071b5a354f48e10bef", // Gem: Swap 2
  "0x0a267cf51ef038fc00e71801f5a524aec06e4f07", // Genie: Swap
]);

// Legacy export for backwards compatibility
export const SEAPORT_ADDRESSES = new Set([
  "0x00000000006c3852cbef3e08e8df289169ede581",
  "0x00000000000001ad428e4906ae43d8f9852d0dd6",
  "0x00000000000000adc04c56bf30ac9d3c0aaf14dc",
  "0x0000000000000068f116a894984e2db1123eb395",
]);

/**
 * Check if an address is a known marketplace operator/contract
 */
export function isMarketplaceAddress(address: string): boolean {
  return MARKETPLACE_ADDRESSES.has(address.toLowerCase());
}
