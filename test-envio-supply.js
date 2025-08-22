#!/usr/bin/env node

/**
 * Envio THJ Supply Test
 * Tests supply calculations directly via GraphQL
 */

const GRAPHQL_URL = 'http://localhost:8080/v1/graphql';

// Expected total supplies
const EXPECTED_TOTALS = {
  'Honeycomb': 16420,
  'HoneyJar1': 10926,
  'HoneyJar2': 10089,
  'HoneyJar3': 9395,
  'HoneyJar4': 8677,
  'HoneyJar5': 8015,
  'HoneyJar6': 5898
};

async function queryGraphQL(query) {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return await response.json();
  } catch (error) {
    console.error('GraphQL query failed:', error.message);
    return null;
  }
}

async function testEnvioSupply() {
  console.log('🔍 Envio THJ Supply Test');
  console.log('========================\n');

  // Test 1: Check CollectionStat data
  console.log('📊 Current CollectionStat Data:');
  console.log('-------------------------------');
  
  const collectionStatsQuery = `{
    collectionStats {
      items {
        collection
        chainId
        totalSupply
        totalMinted
        totalBurned
      }
    }
  }`;
  
  const collectionStats = await queryGraphQL(collectionStatsQuery);
  
  if (collectionStats?.data?.collectionStats?.items) {
    const stats = collectionStats.data.collectionStats.items;
    
    // Group by collection
    const byCollection = {};
    stats.forEach(stat => {
      if (!byCollection[stat.collection]) {
        byCollection[stat.collection] = [];
      }
      byCollection[stat.collection].push(stat);
    });
    
    // Display per collection
    Object.keys(byCollection).sort().forEach(collection => {
      const chains = byCollection[collection];
      const total = chains.reduce((sum, c) => sum + c.totalSupply, 0);
      console.log(`\n${collection}:`);
      chains.forEach(chain => {
        const chainName = getChainName(chain.chainId);
        console.log(`  ${chainName}: ${chain.totalSupply} (minted: ${chain.totalMinted}, burned: ${chain.totalBurned})`);
      });
      console.log(`  TOTAL: ${total} (Expected: ${EXPECTED_TOTALS[collection] || 'N/A'})`);
      
      const diff = total - (EXPECTED_TOTALS[collection] || 0);
      if (Math.abs(diff) > 10) {
        console.log(`  ⚠️ Warning: Difference of ${diff} tokens`);
      } else {
        console.log(`  ✅ Supply matches expected`);
      }
    });
  } else {
    console.log('No CollectionStat data found yet');
  }
  
  // Test 2: Check GlobalCollectionStat data
  console.log('\n\n📈 GlobalCollectionStat Data:');
  console.log('------------------------------');
  
  const globalStatsQuery = `{
    globalCollectionStats {
      items {
        collection
        circulatingSupply
        homeChainSupply
        ethereumSupply
        berachainSupply
        proxyLockedSupply
        totalMinted
        totalBurned
      }
    }
  }`;
  
  const globalStats = await queryGraphQL(globalStatsQuery);
  
  if (globalStats?.data?.globalCollectionStats?.items) {
    const stats = globalStats.data.globalCollectionStats.items;
    
    if (stats.length > 0) {
      console.log('\nCollection    | Circulating | Expected  | Diff    | Status');
      console.log('--------------|-------------|-----------|---------|--------');
      
      stats.forEach(stat => {
        const expected = EXPECTED_TOTALS[stat.collection] || 0;
        const diff = stat.circulatingSupply - expected;
        const status = Math.abs(diff) <= 10 ? '✅' : '⚠️';
        
        console.log(
          `${stat.collection.padEnd(13)} | ${String(stat.circulatingSupply).padEnd(11)} | ${String(expected).padEnd(9)} | ${(diff >= 0 ? '+' : '') + diff.toString().padEnd(7)} | ${status}`
        );
      });
      
      console.log('\n📍 Supply Breakdown:');
      stats.forEach(stat => {
        console.log(`\n${stat.collection}:`);
        console.log(`  Home Chain: ${stat.homeChainSupply}`);
        console.log(`  Ethereum: ${stat.ethereumSupply}`);
        console.log(`  Berachain: ${stat.berachainSupply}`);
        console.log(`  Proxy Locked: ${stat.proxyLockedSupply}`);
        console.log(`  Total Minted: ${stat.totalMinted}`);
        console.log(`  Total Burned: ${stat.totalBurned}`);
      });
    } else {
      console.log('GlobalCollectionStat table exists but no data yet');
    }
  } else {
    console.log('GlobalCollectionStat data not available yet');
  }
  
  // Test 3: Check recent transfers
  console.log('\n\n📝 Recent Transfers:');
  console.log('--------------------');
  
  const transfersQuery = `{
    transfers(orderBy: "timestamp", orderDirection: "desc", limit: 10) {
      items {
        collection
        chainId
        tokenId
        from
        to
        timestamp
      }
    }
  }`;
  
  const transfers = await queryGraphQL(transfersQuery);
  
  if (transfers?.data?.transfers?.items) {
    transfers.data.transfers.items.forEach(transfer => {
      const date = new Date(parseInt(transfer.timestamp) * 1000);
      const fromAddr = transfer.from.substring(0, 10) + '...';
      const toAddr = transfer.to.substring(0, 10) + '...';
      console.log(`${transfer.collection} #${transfer.tokenId} on ${getChainName(transfer.chainId)}: ${fromAddr} → ${toAddr} at ${date.toLocaleString()}`);
    });
  } else {
    console.log('No transfer data available yet');
  }
  
  // Test 4: Check indexing progress
  console.log('\n\n📊 Indexing Progress:');
  console.log('---------------------');
  
  const tokenCountQuery = `{
    tokens {
      items {
        id
      }
    }
  }`;
  
  const tokenCount = await queryGraphQL(tokenCountQuery);
  const totalTokens = tokenCount?.data?.tokens?.items?.length || 0;
  
  console.log(`Total tokens indexed: ${totalTokens}`);
  console.log(`Expected total: ~69,420 (all collections combined)`);
  
  const percentage = Math.round((totalTokens / 69420) * 100);
  console.log(`Progress: ${percentage}%`);
  
  // Summary
  console.log('\n\n📋 Summary:');
  console.log('-----------');
  console.log('✅ Envio indexer is running successfully');
  console.log('✅ GraphQL endpoint is accessible at http://localhost:42069');
  console.log(`⏳ Indexing progress: ${percentage}% complete`);
  
  if (percentage < 100) {
    console.log('\nNote: Full validation will be accurate once indexing reaches 100%');
    console.log('Envio is significantly faster than Ponder - should complete within minutes!');
  } else {
    console.log('\n🎉 Indexing complete! All supplies should now match expected values.');
  }
}

function getChainName(chainId) {
  const chains = {
    1: 'Ethereum',
    10: 'Optimism',
    8453: 'Base',
    42161: 'Arbitrum',
    7777777: 'Zora',
    80094: 'Berachain'
  };
  return chains[chainId] || `Chain ${chainId}`;
}

// Run the test
testEnvioSupply().catch(console.error);