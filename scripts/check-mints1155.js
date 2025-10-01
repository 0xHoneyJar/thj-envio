const { TestHelpers } = require("generated");
const { handleCandiesMintSingle } = require("../build/handlers/mints1155");

async function main() {
  const { context, event } = TestHelpers.CandiesMarket1155.TransferSingle.mock({
    params: {
      operator: "0x80283fbf2b8e50f6ddf9bfc4a90a8336bc90e38f",
      from: "0x0000000000000000000000000000000000000000",
      to: "0x4f28e484B5Da61B05D1be30dea0dbBc594155a9c",
      id: BigInt(3291),
      value: BigInt(2),
    },
    block: {
      number: 11051820,
      timestamp: 1759012278,
    },
    transaction: {
      hash: "0x401a96b52fc3ae51d3d41041118b07534a7be2c0a445bb41138ad34cea1679c0",
    },
    logIndex: 0,
    srcAddress: "0xeca03517c5195f1edd634da6d690d6c72407c40c",
    chainId: 80094,
  });

  await handleCandiesMintSingle({ event, context });

  const stored = await context.Erc1155MintEvent.get(
    "0x401a96b52fc3ae51d3d41041118b07534a7be2c0a445bb41138ad34cea1679c0_0"
  );

  console.log(stored);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
