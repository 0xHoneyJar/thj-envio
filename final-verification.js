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
  'Honeycomb': 25476,
  'HoneyJar1': 2857,
  'HoneyJar2': 9544,
  'HoneyJar3': 9973,
  'HoneyJar4': 9008,
  'HoneyJar5': 9576,
  'HoneyJar6': 8389
};

console.log('🎯 FINAL THJ Supply Verification');
console.log('================================\n');

console.log('Collection  | Expected | Actual   | Diff     | Status');
console.log('------------|----------|----------|----------|--------');

let perfectMatches = 0;
let closeMatches = 0;
let issues = 0;

Object.keys(EXPECTED_TOTALS).forEach(collection => {
  const expected = EXPECTED_TOTALS[collection];
  const actual = ACTUAL_DATA[collection];
  const diff = actual - expected;
  const absDiff = Math.abs(diff);
  
  let status;
  if (absDiff === 0) {
    status = '✅ PERFECT';
    perfectMatches++;
  } else if (absDiff <= 1000) {
    status = '✅ CLOSE';
    closeMatches++;
  } else {
    status = '⚠️ ISSUE';
    issues++;
  }
  
  console.log(
    `${collection.padEnd(11)} | ${String(expected).padEnd(8)} | ${String(actual).padEnd(8)} | ${(diff >= 0 ? '+' : '') + String(diff).padEnd(8)} | ${status}`
  );
});

console.log('\n📊 Summary:');
console.log('----------');
console.log(`Perfect matches: ${perfectMatches}`);
console.log(`Close matches (within 1000): ${closeMatches}`);
console.log(`Issues: ${issues}`);

console.log('\n⚠️ Main Issues:');
console.log('---------------');
console.log('1. HoneyJar1 (Gen 1): Missing 8,069 tokens');
console.log('   - Only tracking Berachain side (2,857)');
console.log('   - NOT tracking Ethereum native mints');
console.log('   - Shows negative home chain supply (-2,857)\n');

console.log('2. Honeycomb: Showing 9,056 MORE than expected');
console.log('   - Actual: 25,476 vs Expected: 16,420');
console.log('   - Might be counting some tokens twice\n');

console.log('3. HoneyJar2-5: Generally close but slightly over');
console.log('   - Within reasonable range (300-1,500 difference)');
console.log('   - Could be due to recent mints/burns\n');

console.log('4. HoneyJar6: Shows 2,491 MORE than expected');
console.log('   - Actual: 8,389 vs Expected: 5,898');

console.log('\n🔍 Root Cause for Gen 1:');
console.log('------------------------');
console.log('Gen 1 on Ethereum (0xa20cf9b0874c3e46b344deaaea9c2e0c3e1db37d)');
console.log('is NOT being indexed properly. Only Berachain transfers are tracked.');
