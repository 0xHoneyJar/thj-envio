/*
 * Shared constants for THJ indexer
 */

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const BERACHAIN_TESTNET_ID = 80094;
export const BERACHAIN_MAINNET_ID = 80084;
// Note: Despite the naming above, 80094 is actually mainnet. Use BERACHAIN_ID for clarity.
export const BERACHAIN_ID = 80094;

// Kingdomly proxy bridge contracts (these hold NFTs when bridged to Berachain)
export const PROXY_CONTRACTS: Record<string, string> = {
  HoneyJar1: "0xe0b791529f7876dc2b9d748a2e6570e605f40e5e",
  HoneyJar2: "0xd1d5df5f85c0fcbdc5c9757272de2ee5296ed512",
  HoneyJar3: "0x3992605f13bc182c0b0c60029fcbb21c0626a5f1",
  HoneyJar4: "0xeeaa4926019eaed089b8b66b544deb320c04e421",
  HoneyJar5: "0x00331b0e835c511489dba62a2b16b8fa380224f9",
  HoneyJar6: "0x0de0f0a9f7f1a56dafd025d0f31c31c6cb190346",
  Honeycomb: "0x33a76173680427cba3ffc3a625b7bc43b08ce0c5",
};

// Address to collection mapping (includes all contracts)
export const ADDRESS_TO_COLLECTION: Record<string, string> = {
  // Ethereum mainnet
  "0xa20cf9b0874c3e46b344deaeea9c2e0c3e1db37d": "HoneyJar1",
  "0x98dc31a9648f04e23e4e36b0456d1951531c2a05": "HoneyJar6",
  "0xcb0477d1af5b8b05795d89d59f4667b59eae9244": "Honeycomb",
  // Ethereum L0 reminted contracts (when bridged from native chains)
  "0x3f4dd25ba6fb6441bfd1a869cbda6a511966456d": "HoneyJar2",
  "0x49f3915a52e137e597d6bf11c73e78c68b082297": "HoneyJar3",
  "0x0b820623485dcfb1c40a70c55755160f6a42186d": "HoneyJar4",
  "0x39eb35a84752b4bd3459083834af1267d276a54c": "HoneyJar5",
  // Arbitrum
  "0x1b2751328f41d1a0b91f3710edcd33e996591b72": "HoneyJar2",
  // Zora
  "0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0": "HoneyJar3",
  // Optimism
  "0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301": "HoneyJar4",
  // Base
  "0xbad7b49d985bbfd3a22706c447fb625a28f048b4": "HoneyJar5",
  // Berachain
  "0xedc5dfd6f37464cc91bbce572b6fe2c97f1bc7b3": "HoneyJar1",
  "0x1c6c24cac266c791c4ba789c3ec91f04331725bd": "HoneyJar2",
  "0xf1e4a550772fabfc35b28b51eb8d0b6fcd1c4878": "HoneyJar3",
  "0xdb602ab4d6bd71c8d11542a9c8c936877a9a4f45": "HoneyJar4",
  "0x0263728e7f59f315c17d3c180aeade027a375f17": "HoneyJar5",
  "0xb62a9a21d98478f477e134e175fd2003c15cb83a": "HoneyJar6",
  "0x886d2176d899796cd1affa07eff07b9b2b80f1be": "Honeycomb",
};

export const COLLECTION_TO_GENERATION: Record<string, number> = {
  HoneyJar1: 1,
  HoneyJar2: 2,
  HoneyJar3: 3,
  HoneyJar4: 4,
  HoneyJar5: 5,
  HoneyJar6: 6,
  Honeycomb: 0,
};

export const HOME_CHAIN_IDS: Record<number, number> = {
  1: 1, // Gen 1 - Ethereum
  2: 42161, // Gen 2 - Arbitrum
  3: 7777777, // Gen 3 - Zora
  4: 10, // Gen 4 - Optimism
  5: 8453, // Gen 5 - Base
  6: 1, // Gen 6 - Ethereum
  0: 1, // Honeycomb - Ethereum
};