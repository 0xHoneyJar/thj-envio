/**
 * ============================================================
 * MIBERA COLLECTION NAMING GLOSSARY
 * ============================================================
 *
 * NAMING ALIASES (same thing, different names):
 * - Mibera Shadows = Mibera VM (separate generative collection, NOT the main mibera)
 * - Mibera Tarot = Mibera Quiz (tarot cards from a quiz users took)
 * - Mibera Candies = Mibera Drugs (ERC1155 items, handled by mints1155.ts)
 *
 * FRACTURES (10-piece SBFT collection):
 * The Fractures are 10 SBFTs (soul bound fungible tokens) that form a complete set:
 * 1. miparcels
 * 2. miladies (Miladies on Berachain)
 * 3-10. mireveal_1_1 through mireveal_8_8
 *
 * ============================================================
 */

export const TRACKED_ERC721_COLLECTION_KEYS: Record<string, string> = {
  // ===== MIBERA MAIN COLLECTION =====
  // The main Mibera collection (separate from Mibera VM/Shadows)
  "0x6666397dfe9a8c469bf65dc744cb1c733416c420": "mibera",

  // ===== MIBERA TAROT (aka "Mibera Quiz") =====
  // Tarot cards from a quiz users took - same thing, different names
  "0x4b08a069381efbb9f08c73d6b2e975c9be3c4684": "mibera_tarot",

  // ===== FRACTURES (10-piece SBFT collection) =====
  // All 10 contracts below are part of the "Fractures" set
  // These are SBFTs (soul bound fungible tokens) that form a complete collection
  "0x86db98cf1b81e833447b12a077ac28c36b75c8e1": "miparcels", // fracture #1
  "0x8d4972bd5d2df474e71da6676a365fb549853991": "miladies", // fracture #2: Miladies on Berachain
  "0x144b27b1a267ee71989664b3907030da84cc4754": "mireveal_1_1", // fracture #3
  "0x72db992e18a1bf38111b1936dd723e82d0d96313": "mireveal_2_2", // fracture #4
  "0x3a00301b713be83ec54b7b4fb0f86397d087e6d3": "mireveal_3_3", // fracture #5
  "0x419f25c4f9a9c730aacf58b8401b5b3e566fe886": "mireveal_4_20", // fracture #6
  "0x81a27117bd894942ba6737402fb9e57e942c6058": "mireveal_5_5", // fracture #7
  "0xaab7b4502251ae393d0590bab3e208e2d58f4813": "mireveal_6_6", // fracture #8
  "0xc64126ea8dc7626c16daa2a29d375c33fcaa4c7c": "mireveal_7_7", // fracture #9
  "0x24f4047d372139de8dacbe79e2fc576291ec3ffc": "mireveal_8_8", // fracture #10
  // NOTE: mibera_zora is ERC-1155 (Zora platform), handled by MiberaZora1155 handler

  // ===== OPTIMISM - Mibera Lore Articles =====
  // Mirror WritingEditions ERC-721 collections
  "0x6b31859e5e32a5212f1ba4d7b377604b9d4c7a60": "lore_1_introducing_mibera",
  "0x9247edf18518c4dccfa7f8b2345a1e8a4738204f": "lore_2_honey_online_offline",
  "0xb2c7f411aa425d3fce42751e576a01b1ff150385": "lore_3_bera_kali_acc",
  "0xa12064e3b1f6102435e77aa68569e79955070357": "lore_4_bgt_network_spirituality",
  "0x6ca29eed22f04c1ec6126c59922844811dcbcdfa": "lore_5_initiation_ritual",
  "0x7988434e1469d35fa5f442e649de45d47c3df23c": "lore_6_miberamaker_design",
  "0x96c200ec4cca0bc57444cfee888cfba78a1ddbd8": "lore_7_miberamaker_design",
};

/**
 * Collections that should track all transfers (not just mints/burns)
 * Used for timeline/activity tracking
 */
export const TRANSFER_TRACKED_COLLECTIONS = new Set<string>([
  "mibera",
  // NOTE: mibera_zora is ERC-1155, transfers tracked by mibera-zora.ts handler

  // Mibera Lore Articles - track all transfers for timeline
  "lore_1_introducing_mibera",
  "lore_2_honey_online_offline",
  "lore_3_bera_kali_acc",
  "lore_4_bgt_network_spirituality",
  "lore_5_initiation_ritual",
  "lore_6_miberamaker_design",
  "lore_7_miberamaker_design",
]);
