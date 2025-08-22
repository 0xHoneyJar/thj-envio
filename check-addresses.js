const contracts = {
  'HoneyJar1': {
    native: { chain: 'Ethereum', address: '0xa20CF9B0874c3E46b344DEAEEa9c2e0C3E1db37d' },
    berachain: '0xedc5dfd6f37464cc91bbce572b6fe2c97f1bc7b3'
  },
  'HoneyJar2': {
    native: { chain: 'Arbitrum', address: '0x1b2751328F41D1A0b91f3710EDcd33E996591B72' },
    ethereum: '0x3f4DD25BA6Fb6441Bfd1a869Cbda6a511966456D',
    berachain: '0x1c6c24cac266c791c4ba789c3ec91f04331725bd'
  },
  'HoneyJar3': {
    native: { chain: 'Zora', address: '0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0' },
    ethereum: '0x49f3915a52e137e597d6bf11c73e78c68b082297', // Wrong! This is on mainnet in contracts.ts line 297
    berachain: '0xf1e4a550772fabfc35b28b51eb8d0b6fcd1c4878'
  },
  'HoneyJar4': {
    native: { chain: 'Optimism', address: '0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301' },
    ethereum: '0x0b820623485dcfb1c40a70c55755160f6a42186d', // Wrong! This is on mainnet in contracts.ts line 342
    berachain: '0xdb602ab4d6bd71c8d11542a9c8c936877a9a4f45'
  },
  'HoneyJar5': {
    native: { chain: 'Base', address: '0xbad7b49d985bbfd3a22706c447fb625a28f048b4' },
    ethereum: '0x39eb35a84752b4bd3459083834af1267d276a54c', // Wrong! This is on mainnet in contracts.ts line 388
    berachain: '0x0263728e7f59f315c17d3c180aeade027a375f17'
  },
  'HoneyJar6': {
    native: { chain: 'Ethereum', address: '0x98Dc31A9648F04E23e4E36B0456D1951531C2a05' },
    berachain: '0xb62a9a21d98478f477e134e175fd2003c15cb83a'
  }
};

console.log('Issues found:');
console.log('1. HoneyJar3-5 have Ethereum bridge contracts that we are NOT tracking!');
console.log('   - HoneyJar3 Eth: 0x49f3915a52e137e597d6bf11c73e78c68b082297');
console.log('   - HoneyJar4 Eth: 0x0b820623485dcfb1c40a70c55755160f6a42186d'); 
console.log('   - HoneyJar5 Eth: 0x39eb35a84752b4bd3459083834af1267d276a54c');
console.log('\n2. These are listed as HONEYJAR_ADDRESS on mainnet in contracts.ts');
console.log('   but we are using the wrong addresses in config.yaml!');
