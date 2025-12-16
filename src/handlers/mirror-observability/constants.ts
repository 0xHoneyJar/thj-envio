/*
 * Mibera Article Contract Addresses (Mirror WritingEditions clones on Optimism)
 *
 * These are the specific article contracts we want to track.
 * The Mirror Observability contract emits events for ALL articles,
 * so we filter to only process Mibera-related articles.
 */

// Mibera article clone addresses (lowercase for comparison)
export const MIBERA_ARTICLE_CONTRACTS: Map<string, string> = new Map([
  // Lore 1 ♡ Introducing Mibera (4,713 supply)
  ["0x6b31859e5e32a5212f1ba4d7b377604b9d4c7a60", "lore_1_introducing_mibera"],
  // Lore 2 ♡ [HONEY] Online to get Offline: Clear pill vs Rave pill (2,355 supply)
  ["0x9247edf18518c4dccfa7f8b2345a1e8a4738204f", "lore_2_honey_online_offline"],
  // Lore 3 ♡ [BERA] Kali/acc vs Cybernetic Psychedelic Mysticism (1,175 supply)
  ["0xb2c7f411aa425d3fce42751e576a01b1ff150385", "lore_3_bera_kali_acc"],
  // Lore 4 ♡ [BGT] Network Spirituality (Spirit) vs Network Mysticism (Soul) (571 supply)
  ["0xa12064e3b1f6102435e77aa68569e79955070357", "lore_4_bgt_network_spirituality"],
  // Lore 5 ♡ Mibera Initiation Ritual (271 supply)
  ["0x6ca29eed22f04c1ec6126c59922844811dcbcdfa", "lore_5_initiation_ritual"],
  // Lore 6 ♡ MiberaMaker Design Document (126 supply)
  ["0x7988434e1469d35fa5f442e649de45d47c3df23c", "lore_6_miberamaker_design"],
  // Lore 7 ♡ MiberaMaker Design Document (107 supply)
  ["0x96c200ec4cca0bc57444cfee888cfba78a1ddbd8", "lore_7_miberamaker_design"],
]);

// Set for quick lookup
export const MIBERA_ARTICLE_ADDRESSES: Set<string> = new Set(
  MIBERA_ARTICLE_CONTRACTS.keys()
);

/**
 * Check if a clone address is a Mibera article
 */
export function isMiberaArticle(cloneAddress: string): boolean {
  return MIBERA_ARTICLE_ADDRESSES.has(cloneAddress.toLowerCase());
}

/**
 * Get the article key for a clone address
 */
export function getArticleKey(cloneAddress: string): string | undefined {
  return MIBERA_ARTICLE_CONTRACTS.get(cloneAddress.toLowerCase());
}
