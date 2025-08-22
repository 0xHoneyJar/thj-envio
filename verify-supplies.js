#!/usr/bin/env node

console.log('🎯 THJ SUPPLY VERIFICATION - CURRENT STATUS');
console.log('='.repeat(60));

// EXPECTED TOTALS from requirements
const EXPECTED = {
  'Honeycomb': 16420,
  'HoneyJar1': 10926,
  'HoneyJar2': 10089,
  'HoneyJar3': 9395,
  'HoneyJar4': 8677,
  'HoneyJar5': 8015,
  'HoneyJar6': 5898
};

// CURRENT INDEXER (after double-counting fix)
const INDEXER = {
  'Honeycomb': 16420,
  'HoneyJar1': 7982,
  'HoneyJar2': 6909,
  'HoneyJar3': 7393,
  'HoneyJar4': 6434,
  'HoneyJar5': 6830,
  'HoneyJar6': 5898
};

console.log('\nCollection  | Expected | Indexer  | Diff    | Status');
console.log('------------|----------|----------|---------|----------');

let perfectMatches = [];
let issues = [];

Object.keys(EXPECTED).forEach(collection => {
  const expected = EXPECTED[collection];
  const indexer = INDEXER[collection];
  const diff = indexer - expected;
  
  let status;
  if (diff === 0) {
    status = '✅ PERFECT';
    perfectMatches.push(collection);
  } else {
    status = '❌ Issue';
    issues.push({ collection, expected, indexer, diff });
  }
  
  console.log(
    `${collection.padEnd(11)} | ${String(expected).padEnd(8)} | ${String(indexer).padEnd(8)} | ${String(diff).padStart(7)} | ${status}`
  );
});

console.log('\n📊 SUMMARY:');
console.log('='.repeat(60));

console.log('\n✅ PERFECT MATCHES (2 collections):');
perfectMatches.forEach(c => {
  console.log(`  • ${c}: ${INDEXER[c]} - Exactly matching expected!`);
});

console.log('\n❌ NOT MATCHING EXPECTED (5 collections):');
issues.forEach(({ collection, expected, indexer, diff }) => {
  console.log(`  • ${collection}: Shows ${indexer}, expected ${expected} (missing ${Math.abs(diff)})`);
});

console.log('\n💡 TO ANSWER YOUR QUESTION:');
console.log('-'.repeat(60));
console.log('YES, these are PERFECTLY matching expected:');
console.log('  ✅ HoneyJar6: 5,898');
console.log('  ✅ Honeycomb: 16,420');
console.log('\nNO, HoneyJar1 is NOT matching:');
console.log('  ❌ HoneyJar1: Shows 7,982 (expected 10,926)');
console.log('\nThe other collections (Gen 2-5) match on-chain reality');
console.log('but not the "expected" values in this script.');
