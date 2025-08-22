import assert from "assert";
import { 
  TestHelpers,
  HoneyJar_Approval
} from "generated";
const { MockDb, HoneyJar } = TestHelpers;

describe("HoneyJar contract Approval event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Commented out - we only track Transfer events, not Approval
  // const event = HoneyJar.Approval.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it.skip("HoneyJar_Approval is created correctly", async () => {
    // // Processing the event
    // const mockDbUpdated = await HoneyJar.Approval.processEvent({
    //   event,
    //   mockDb,
    // });

    // // Getting the actual entity from the mock database
    // let actualHoneyJarApproval = mockDbUpdated.entities.HoneyJar_Approval.get(
    //   `${event.chainId}_${event.block.number}_${event.logIndex}`
    // );

    // Creating the expected entity
    const expectedHoneyJarApproval: HoneyJar_Approval = {
      id: `${1}_${1}_${1}`,
      owner: "0x0000000000000000000000000000000000000000",
      approved: "0x0000000000000000000000000000000000000000",
      tokenId: BigInt(0),
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    // assert.deepEqual(actualHoneyJarApproval, expectedHoneyJarApproval, "Actual HoneyJarApproval should be the same as the expectedHoneyJarApproval");
  });
});
