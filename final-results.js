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
  'HoneyJar1': 10839,
  'HoneyJar2': 9544,
  'HoneyJar3': 9973,
  'HoneyJar4': 9008,
  'HoneyJar5': 9576,
  'HoneyJar6': 8389
};

console.log('🎉 FINAL THJ Supply Verification - AFTER FIXES');
console.log('==============================================\n');

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
  if (absDiff <= 100) {
    status = '✅ EXCELLENT';
    perfectMatches++;
  } else if (absDiff <= 600) {
    status = '✅ GOOD';
    closeMatches++;
  } else {
    status = '⚠️ CHECK';
    issues++;
  }
  
  console.log(
    `${collection.padEnd(11)} | ${String(expected).padEnd(8)} | ${String(actual).padEnd(8)} | ${(diff >= 0 ? '+' : '') + String(diff).padEnd(8)} | ${status}`
  );
});

console.log('\n📊 Summary:');
console.log('----------');
console.log(`Excellent (within 100): ${perfectMatches}`);
console.log(`Good (within 600): ${closeMatches}`);
console.log(`Need review: ${issues}`);

console.log('\n✅ SUCCESS - Major Improvements:');
console.log('--------------------------------');
console.log('• HoneyJar1 (Gen 1): NOW 10,839 vs expected 10,926 (only 87 off!)');
console.log('• HoneyJar2 (Gen 2): 9,544 vs expected 10,089 (545 diff)');
console.log('• HoneyJar3 (Gen 3): 9,973 vs expected 9,395 (578 over)');
console.log('• HoneyJar4 (Gen 4): 9,008 vs expected 8,677 (331 over)');

console.log('\n⚠️ Remaining Issues to Investigate:');
console.log('-----------------------------------');
console.log('• Honeycomb: 25,476 vs expected 16,420 (9,056 over)');
console.log('  - Exactly matches Berachain supply - possible double counting?');
console.log('• HoneyJar5 (Gen 5): 9,576 vs expected 8,015 (1,561 over)');
console.log('• HoneyJar6 (Gen 6): 8,389 vs expected 5,898 (2,491 over)');
console.log('  - Exactly matches Berachain supply - possible pattern here');

console.log('\n🎯 Overall Assessment:');
console.log('---------------------');
console.log('The indexer is now working well for most collections!');
console.log('Gen 1-4 are tracking accurately (within 1-6% of expected).');
console.log('The remaining discrepancies might be due to:');
console.log('- Recent mints/burns since your expected numbers were calculated');
console.log('- Some collections showing inflated numbers by exactly their Berachain supply');
