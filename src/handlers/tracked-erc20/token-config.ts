/*
 * Per-Token Feature Configuration
 * Enables feature flags for burn tracking, holder stats, etc. per token
 */

export interface TokenConfig {
  key: string;
  burnTracking: boolean;
  holderStats: boolean;
  burnSources?: Record<string, string>; // contract address -> source name
}

// Henlo burn source addresses (Berachain mainnet)
export const HENLO_BURN_SOURCES: Record<string, string> = {
  "0xde81b20b6801d99efeaeced48a11ba025180b8cc": "incinerator",
  // TODO: Add actual OverUnder contract address when available
  // TODO: Add actual BeraTrackr contract address when available
};

export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // HENLO token - full tracking (burns + holder stats)
  "0xb2f776e9c1c926c4b2e54182fac058da9af0b6a5": {
    key: "henlo",
    burnTracking: true,
    holderStats: true,
    burnSources: HENLO_BURN_SOURCES,
  },
  // HENLOCKED tier tokens - balance tracking only
  "0xf0edfc3e122db34773293e0e5b2c3a58492e7338": {
    key: "hlkd1b",
    burnTracking: false,
    holderStats: false,
  },
  "0x8ab854dc0672d7a13a85399a56cb628fb22102d6": {
    key: "hlkd690m",
    burnTracking: false,
    holderStats: false,
  },
  "0xf07fa3ece9741d408d643748ff85710bedef25ba": {
    key: "hlkd420m",
    burnTracking: false,
    holderStats: false,
  },
  "0x37dd8850919ebdca911c383211a70839a94b0539": {
    key: "hlkd330m",
    burnTracking: false,
    holderStats: false,
  },
  "0x7bdf98ddeed209cfa26bd2352b470ac8b5485ec5": {
    key: "hlkd100m",
    burnTracking: false,
    holderStats: false,
  },
};
