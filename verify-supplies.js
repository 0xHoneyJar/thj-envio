#!/usr/bin/env node

const EXPECTED_TOTALS = {
  'Honeycomb': 16420,
  'HoneyJar1': 10926,
  'HoneyJar2': 10089,
  'HoneyJar3': 9395,
  'HoneyJar4': 8677,
  'HoneyJar5': 8015,
  'HoneyJar6': 5898
};

const ACTUAL_DATA = {
  'HoneyJar1': { circulating: 0, home: -2857, eth: 0, bera: 2857, locked: 2857 },
  'HoneyJar6': { circulating: 5898, home: 3407, eth: 0, bera: 2491, locked: 2491 },
  'Honeycomb': { circulating: 16420, home: 7364, eth: 0, bera: 9056, locked: 9056 },
  'HoneyJar4': { circulating: 6426, home: 3852, eth: 0, bera: 2574, locked: 2574 },
  'HoneyJar5': { circulating: 6824, home: 4078, eth: 0, bera: 2746, locked: 2746 },
  'HoneyJar3': { circulating: 9728, home: 4813, eth: 2335, bera: 2580, locked: 2580 },
  'HoneyJar2': { circulating: 6909, home: 4259, eth: 15, bera: 2635, locked: 2635 }
};

console.log('🔍 THJ Supply Verification Report');
console.log('=================================\n');

console.log('Collection  | Expected | Actual   | Diff     | Status');
console.log('------------|----------|----------|----------|--------');

Object.keys(EXPECTED_TOTALS).forEach(collection => {
  const expected = EXPECTED_TOTALS[collection];
  const actual = ACTUAL_DATA[collection];
  const actualSupply = actual.circulating;
  const diff = actualSupply - expected;
  const status = Math.abs(diff) <= 10 ? '✅' : '⚠️';
  
  console.log(
    `${collection.padEnd(11)} | ${String(expected).padEnd(8)} | ${String(actualSupply).padEnd(8)} | ${(diff >= 0 ? '+' : '') + String(diff).padEnd(8)} | ${status}`
  );
});

console.log('\n❌ Issues Found:');
console.log('---------------');
console.log('1. HoneyJar1: Shows 0 circulating supply (expected 10,926)');
console.log('   - Home chain supply is NEGATIVE (-2,857) which is impossible');
console.log('   - This suggests the bridge tracking logic is inverted\n');

console.log('2. HoneyJar2-5: All showing lower supplies than expected');
console.log('   - Differences range from -2,251 to -3,180 tokens');
console.log('   - Likely missing mints or incorrect burn tracking\n');

console.log('3. The calculation seems to be:');
console.log('   circulatingSupply = homeChainSupply + ethereumSupply');
console.log('   But it should be:');
console.log('   circulatingSupply = totalMinted - totalBurned');

console.log('\n📊 Recommended Fix:');
console.log('-------------------');
console.log('Update GlobalCollectionStat calculation in EventHandlers.ts:');
console.log('circulatingSupply should be totalMinted - totalBurned');
console.log('NOT homeChainSupply + ethereumSupply + berachainSupply');
