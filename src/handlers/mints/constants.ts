/**
 * ============================================================
 * Collection metadata for generalized mint tracking
 * ============================================================
 *
 * Maps contract address (lowercase) to a friendly collection key.
 *
 * NAMING ALIASES (same thing, different names):
 * - mibera_vm = "Mibera Shadows" (separate generative collection, NOT the main mibera)
 * - mibera_drugs = "Mibera Candies" (ERC1155 items - candies/drugs are interchangeable)
 * - mibera_tarot = "Mibera Quiz" (tarot cards from a quiz users took)
 *
 * ============================================================
 */

export const MINT_COLLECTION_KEYS: Record<string, string> = {
  // ===== MIBERA SHADOWS (aka "Mibera VM") =====
  // The VM (Virtual Mibera) generative collection - also known as Mibera Shadows
  "0x048327a187b944ddac61c6e202bfccd20d17c008": "mibera_vm",

  // ===== MIBERA CANDIES (aka "Mibera Drugs") =====
  // ERC1155 items - candies and drugs are interchangeable terms for the same thing
  "0x80283fbf2b8e50f6ddf9bfc4a90a8336bc90e38f": "mibera_drugs", // SilkRoad marketplace
  "0xeca03517c5195f1edd634da6d690d6c72407c40c": "mibera_drugs", // secondary contract

  // ===== OTHER MIBERA COLLECTIONS =====
  "0x230945e0ed56ef4de871a6c0695de265de23d8d8": "mibera_gif",

  // ===== MIBERA TAROT (aka "Mibera Quiz") =====
  // Tarot cards from a quiz users took - same thing, different names
  "0x4b08a069381efbb9f08c73d6b2e975c9be3c4684": "mibera_tarot",
};

// SilkRoad marketplace contract for Mibera Candies/Drugs
export const CANDIES_MARKET_ADDRESS =
  "0x80283fbf2b8e50f6ddf9bfc4a90a8336bc90e38f";
