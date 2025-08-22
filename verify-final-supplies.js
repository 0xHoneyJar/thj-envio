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
  'HoneyJar1': { circulating: 0, totalMinted: 2868, totalBurned: 11, correctCalc: 2857 },
  'HoneyJar2': { circulating: 6909, totalMinted: 9575, totalBurned: 31, correctCalc: 9544 },
  'HoneyJar3': { circulating: 7393, totalMinted: 9981, totalBurned: 8, correctCalc: 9973 },
  'HoneyJar4': { circulating: 6434, totalMinted: 9022, totalBurned: 14, correctCalc: 9008 },
  'HoneyJar5': { circulating: 6830, totalMinted: 9598, totalBurned: 22, correctCalc: 9576 },
  'HoneyJar6': { circulating: 5898, totalMinted: 8426, totalBurned: 37, correctCalc: 8389 },
  'Honeycomb': { circulating: 16420, totalMinted: 25611, totalBurned: 135, correctCalc: 25476 }
};

console.log('🔍 THJ Supply Verification - FINAL REPORT');
console.log('=========================================\n');

console.log('Collection  | Expected | Current  | Should Be | Status');
console.log('------------|----------|----------|-----------|--------');

Object.keys(EXPECTED_TOTALS).forEach(collection => {
  const expected = EXPECTED_TOTALS[collection];
  const actual = ACTUAL_DATA[collection];
  const currentSupply = actual.circulating;
  const shouldBe = actual.correctCalc; // totalMinted - totalBurned
  const status = Math.abs(currentSupply - expected) <= 10 ? '✅' : '⚠️';
  
  console.log(
    `${collection.padEnd(11)} | ${String(expected).padEnd(8)} | ${String(currentSupply).padEnd(8)} | ${String(shouldBe).padEnd(9)} | ${status}`
  );
});

console.log('\n❌ Critical Issues Found:');
console.log('------------------------');
console.log('1. HoneyJar1: Still showing 0 supply (should be 10,926)');
console.log('   - Only 2,868 mints tracked vs expected ~11,000');
console.log('   - Missing 8,000+ mint events on Ethereum\n');

console.log('2. HoneyJar2-5: Still under-reporting by 2,000-3,000 tokens');
console.log('   - Even with corrected L0 remint addresses');
console.log('   - Suggests missing mint events or incorrect tracking\n');

console.log('3. The calculation formula is WRONG:');
console.log('   - Currently using: homeChainSupply + ethereumSupply');
console.log('   - Should be using: totalMinted - totalBurned\n');

console.log('📊 If we fix the formula:');
console.log('-------------------------');
Object.keys(EXPECTED_TOTALS).forEach(collection => {
  const expected = EXPECTED_TOTALS[collection];
  const actual = ACTUAL_DATA[collection];
  const correctSupply = actual.correctCalc;
  const diff = correctSupply - expected;
  const status = Math.abs(diff) <= 10 ? '✅' : '⚠️';
  
  console.log(`${collection}: ${correctSupply} (${diff >= 0 ? '+' : ''}${diff} from expected) ${status}`);
});
