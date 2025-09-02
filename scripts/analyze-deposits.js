#!/usr/bin/env node

/**
 * Analyze deposit sources to understand what's being captured
 */

const GRAPHQL_ENDPOINT = 'https://indexer.dev.hyperindex.xyz/b318773/v1/graphql';

async function queryGraphQL(query) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

async function analyzeDeposits() {
  console.log('🔍 Analyzing Deposit Sources...\n');
  
  // Count deposits by unique from addresses
  const uniqueFromQuery = `
    query {
      AquaberaDeposit(distinct_on: from) {
        from
      }
    }
  `;
  
  // Get a sample of deposits with full details
  const sampleDepositsQuery = `
    query {
      AquaberaDeposit(limit: 20, order_by: {amount: desc}) {
        id
        amount
        shares
        from
        isWallContribution
        blockNumber
        transactionHash
      }
    }
  `;
  
  // Check for any deposits with isWallContribution = true
  const wallDepositsQuery = `
    query {
      AquaberaDeposit(where: {isWallContribution: {_eq: true}}, limit: 10) {
        id
        amount
        from
        transactionHash
      }
    }
  `;
  
  try {
    // Get unique depositors
    console.log('📊 Unique Depositors:');
    const uniqueResult = await queryGraphQL(uniqueFromQuery);
    const uniqueAddresses = uniqueResult.data?.AquaberaDeposit || [];
    console.log(`  Total unique addresses: ${uniqueAddresses.length}`);
    
    // Check for wall address
    const wallAddress = '0x05c98986fc75d63ef973c648f22687d1a8056cd6';
    const hasWallAddress = uniqueAddresses.some(
      item => item.from.toLowerCase() === wallAddress.toLowerCase()
    );
    console.log(`  Wall contract found: ${hasWallAddress ? '✅ YES' : '❌ NO'}`);
    
    // Get sample of largest deposits
    console.log('\n💰 Largest Deposits (by amount):');
    const sampleResult = await queryGraphQL(sampleDepositsQuery);
    const samples = sampleResult.data?.AquaberaDeposit || [];
    
    samples.slice(0, 5).forEach((deposit, index) => {
      const amountInBera = (BigInt(deposit.amount) / BigInt(10**18)).toString();
      console.log(`\n  ${index + 1}. Amount: ${amountInBera} BERA`);
      console.log(`     From: ${deposit.from}`);
      console.log(`     Block: ${deposit.blockNumber}`);
      console.log(`     Is Wall: ${deposit.isWallContribution}`);
      console.log(`     TX: ${deposit.transactionHash.slice(0, 10)}...`);
    });
    
    // Check for wall deposits
    console.log('\n🏗️ Wall Contributions:');
    const wallResult = await queryGraphQL(wallDepositsQuery);
    const wallDeposits = wallResult.data?.AquaberaDeposit || [];
    
    if (wallDeposits.length > 0) {
      console.log(`  Found ${wallDeposits.length} wall contributions`);
      wallDeposits.forEach((deposit, index) => {
        const amountInBera = (BigInt(deposit.amount) / BigInt(10**18)).toString();
        console.log(`  ${index + 1}. ${amountInBera} BERA from ${deposit.from}`);
      });
    } else {
      console.log('  ❌ No deposits marked as wall contributions');
    }
    
    // Analysis
    console.log('\n🔍 Analysis:');
    console.log(`  Total deposits indexed: ${samples.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`  Wall address in depositors: ${hasWallAddress ? '✅ YES' : '❌ NO'}`);
    console.log(`  Wall contributions marked: ${wallDeposits.length > 0 ? '✅ YES' : '❌ NO'}`);
    
    if (!hasWallAddress) {
      console.log('\n  ⚠️ The wall contract address is NOT in the depositors list!');
      console.log('  This means either:');
      console.log('    1. The wall deposits are not being captured by the indexer');
      console.log('    2. The Deposit event is not being emitted for wall transactions');
      console.log('    3. The vault might be using a different event signature');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeDeposits();