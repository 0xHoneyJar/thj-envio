#!/usr/bin/env node

/**
 * Diagnostic script to check Aquabera stats and identify issues
 */

// GraphQL endpoint - update if needed
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

async function checkAquaberaStats() {
  console.log('🔍 Checking Aquabera Stats...\n');
  
  // Query global stats
  const statsQuery = `
    query {
      aquaberaStats(where: { id_eq: "global" }) {
        id
        totalBera
        totalShares
        totalDeposited
        totalWithdrawn
        uniqueBuilders
        depositCount
        withdrawalCount
        wallContributions
        wallDepositCount
        lastUpdateTime
      }
    }
  `;
  
  // Query recent deposits
  const depositsQuery = `
    query {
      aquaberaDeposits(orderBy: timestamp_DESC, limit: 10) {
        id
        amount
        shares
        from
        isWallContribution
        timestamp
        transactionHash
      }
    }
  `;
  
  // Query wall contract builder
  const wallBuilderQuery = `
    query {
      aquaberaBuilder(id: "0x05c98986fc75d63ef973c648f22687d1a8056cd6") {
        id
        address
        totalDeposited
        totalWithdrawn
        netDeposited
        currentShares
        depositCount
        withdrawalCount
        isWallContract
      }
    }
  `;
  
  // Query top builders
  const topBuildersQuery = `
    query {
      aquaberaBuilders(orderBy: totalDeposited_DESC, limit: 5) {
        id
        address
        totalDeposited
        totalWithdrawn
        netDeposited
        currentShares
        depositCount
        isWallContract
      }
    }
  `;
  
  try {
    // Get global stats
    console.log('📊 Global Stats:');
    const statsResult = await queryGraphQL(statsQuery);
    const stats = statsResult.data?.aquaberaStats?.[0];
    
    if (stats) {
      console.log(`  Total BERA Value: ${formatBigInt(stats.totalBera)} BERA`);
      console.log(`  Total LP Shares: ${formatBigInt(stats.totalShares)}`);
      console.log(`  Total Deposited: ${formatBigInt(stats.totalDeposited)} BERA`);
      console.log(`  Total Withdrawn: ${formatBigInt(stats.totalWithdrawn)} BERA`);
      console.log(`  Unique Builders: ${stats.uniqueBuilders}`);
      console.log(`  Deposit Count: ${stats.depositCount}`);
      console.log(`  Wall Contributions: ${formatBigInt(stats.wallContributions)} BERA`);
      console.log(`  Wall Deposit Count: ${stats.wallDepositCount}`);
      console.log(`  Last Update: ${new Date(Number(stats.lastUpdateTime) * 1000).toISOString()}`);
    } else {
      console.log('  ❌ No global stats found!');
    }
    
    // Get wall builder stats
    console.log('\n🏗️ Wall Contract (Poku Trump) Stats:');
    const wallResult = await queryGraphQL(wallBuilderQuery);
    const wallBuilder = wallResult.data?.aquaberaBuilder;
    
    if (wallBuilder) {
      console.log(`  Address: ${wallBuilder.address}`);
      console.log(`  Total Deposited: ${formatBigInt(wallBuilder.totalDeposited)} BERA`);
      console.log(`  Net Deposited: ${formatBigInt(wallBuilder.netDeposited)} BERA`);
      console.log(`  Current Shares: ${formatBigInt(wallBuilder.currentShares)}`);
      console.log(`  Deposit Count: ${wallBuilder.depositCount}`);
      console.log(`  Is Wall Contract: ${wallBuilder.isWallContract}`);
    } else {
      console.log('  ❌ Wall contract builder not found!');
    }
    
    // Get recent deposits
    console.log('\n📝 Recent Deposits:');
    const depositsResult = await queryGraphQL(depositsQuery);
    const deposits = depositsResult.data?.aquaberaDeposits || [];
    
    if (deposits.length > 0) {
      deposits.forEach((deposit, index) => {
        console.log(`  ${index + 1}. Amount: ${formatBigInt(deposit.amount)} BERA`);
        console.log(`     Shares: ${formatBigInt(deposit.shares)}`);
        console.log(`     From: ${deposit.from}`);
        console.log(`     Wall Contribution: ${deposit.isWallContribution}`);
        console.log(`     TX: ${deposit.transactionHash}`);
        console.log(`     Time: ${new Date(Number(deposit.timestamp) * 1000).toISOString()}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No deposits found!');
    }
    
    // Get top builders
    console.log('\n🏆 Top Builders:');
    const buildersResult = await queryGraphQL(topBuildersQuery);
    const builders = buildersResult.data?.aquaberaBuilders || [];
    
    if (builders.length > 0) {
      builders.forEach((builder, index) => {
        console.log(`  ${index + 1}. ${builder.address.slice(0, 8)}...`);
        console.log(`     Total Deposited: ${formatBigInt(builder.totalDeposited)} BERA`);
        console.log(`     Net Deposited: ${formatBigInt(builder.netDeposited)} BERA`);
        console.log(`     Deposits: ${builder.depositCount}`);
        console.log(`     Is Wall: ${builder.isWallContract}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No builders found!');
    }
    
    // Analysis
    console.log('\n🔍 Analysis:');
    if (stats) {
      if (stats.totalBera === '0' && stats.depositCount > 0) {
        console.log('  ⚠️ Issue: totalBera is 0 despite having deposits!');
        console.log('  Possible causes:');
        console.log('    - Event parameters are being misinterpreted');
        console.log('    - BigInt conversion issues');
        console.log('    - Wrong field mapping in handlers');
      }
      
      if (stats.wallContributions === '0' && stats.wallDepositCount > 0) {
        console.log('  ⚠️ Issue: wallContributions is 0 despite having wall deposits!');
        console.log('  Possible causes:');
        console.log('    - Wall contract address not being detected correctly');
        console.log('    - isWallContribution logic issue');
      }
      
      if (stats.totalBera !== '0' || stats.wallContributions !== '0') {
        console.log('  ✅ Stats appear to be tracking correctly!');
      }
    }
    
  } catch (error) {
    console.error('Error querying GraphQL:', error);
  }
}

function formatBigInt(value) {
  if (!value) return '0';
  
  // Convert to string if BigInt
  const str = value.toString();
  
  // If it's a large number (likely in wei), convert to more readable format
  if (str.length > 18) {
    const whole = str.slice(0, -18) || '0';
    const decimal = str.slice(-18).slice(0, 4);
    return `${whole}.${decimal}`;
  }
  
  return str;
}

// Run the check
checkAquaberaStats();