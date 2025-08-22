# HoneyJar Gen 2, 3, 4 Contract Addresses for Verification

## HoneyJar Gen 2 (Home: Arbitrum)
**Current Indexer**: 9,544 | **Expected**: 10,089 | **Difference**: -545

### Main Contracts:
- **Arbitrum (Native)**: `0x1b2751328f41d1a0b91f3710edcd33e996591b72`
- **Ethereum (L0 Remint)**: `0x3f4dd25ba6fb6441bfd1a869cbda6a511966456d`
- **Berachain**: `0x1c6c24cac266c791c4ba789c3ec91f04331725bd`
- **Proxy Bridge**: `0xd1d5df5f85c0fcbdc5c9757272de2ee5296ed512`

### To Check:
1. Total supply on Arbitrum (native chain)
2. Total supply on Ethereum (Layer Zero reminted)
3. Total supply on Berachain
4. Tokens held by proxy bridge contract

---

## HoneyJar Gen 3 (Home: Zora)
**Current Indexer**: 9,973 | **Expected**: 9,395 | **Difference**: +578 (OVER!)

### Main Contracts:
- **Zora (Native)**: `0xe798c4d40bc050bc93c7f3b149a0dfe5cfc49fb0`
- **Ethereum (L0 Remint)**: `0x49f3915a52e137e597d6bf11c73e78c68b082297`
- **Berachain**: `0xf1e4a550772fabfc35b28b51eb8d0b6fcd1c4878`
- **Proxy Bridge**: `0x3992605f13bc182c0b0c60029fcbb21c0626a5f1`

### To Check:
1. Total supply on Zora (native chain)
2. Total supply on Ethereum (Layer Zero reminted)
3. Total supply on Berachain
4. Tokens held by proxy bridge contract

---

## HoneyJar Gen 4 (Home: Optimism)
**Current Indexer**: 9,008 | **Expected**: 8,677 | **Difference**: +331 (OVER!)

### Main Contracts:
- **Optimism (Native)**: `0xe1d16cc75c9f39a2e0f5131eb39d4b634b23f301`
- **Ethereum (L0 Remint)**: `0x0b820623485dcfb1c40a70c55755160f6a42186d`
- **Berachain**: `0xdb602ab4d6bd71c8d11542a9c8c936877a9a4f45`
- **Proxy Bridge**: `0xeeaa4926019eaed089b8b66b544deb320c04e421`

### To Check:
1. Total supply on Optimism (native chain)
2. Total supply on Ethereum (Layer Zero reminted)
3. Total supply on Berachain
4. Tokens held by proxy bridge contract

---

## Key Things to Verify:

### For Each Generation:
1. **Native Chain Supply**: Check the totalSupply() on the main contract
2. **Layer Zero Remints**: Check totalSupply() on Ethereum L0 contracts
3. **Berachain Supply**: Check totalSupply() on Berachain contracts
4. **Proxy Balance**: Check balanceOf(proxy_address) on each chain

### Important Notes:
- Gen 2, 3, 4 use Layer Zero burn/mint mechanism (not lock like Ethereum-native)
- When tokens bridge from native chain → other chains: BURN on origin, MINT on destination
- When tokens bridge to Berachain: They might show in proxy contract
- The indexer calculates: `circulatingSupply = totalMinted - totalBurned`

### Explorer Links:
- **Arbitrum**: https://arbiscan.io/
- **Zora**: https://explorer.zora.energy/
- **Optimism**: https://optimistic.etherscan.io/
- **Ethereum**: https://etherscan.io/
- **Berachain Bartio**: https://bartio.beratrail.io/

## Potential Issues to Check:

1. **Gen 3 & 4 are OVER** - Could indicate:
   - Recent minting activity not accounted for
   - Missing burn events
   - Double counting somewhere

2. **Gen 2 is UNDER** - Could indicate:
   - Missing mint events
   - Tokens stuck somewhere not being counted
   - Additional contract addresses we're missing