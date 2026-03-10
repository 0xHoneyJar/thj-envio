import { expect } from "chai";

import {
  DISTRIBUTION_CHANGE_BLOCK,
  GENESIS_DEPOSIT,
  VALIDATORS,
  calculateDirectDepositAssignments,
  calculateRewardSplit,
  calculateRouterRedistributionAssignments,
  predictWithdrawalBlock,
} from "../src/handlers/fatbera-core";

describe("fatbera-core", () => {
  it("predicts withdrawal blocks with the squid formula", () => {
    expect(predictWithdrawalBlock(1966971)).to.equal(2016192);
    expect(predictWithdrawalBlock(8103108)).to.equal(8152320);
  });

  it("excludes validator-only genesis stake from staker rewards", () => {
    const validator1 = calculateRewardSplit({
      baseRate: 1000n,
      totalDeposited: GENESIS_DEPOSIT + 1000n,
      validatorPubkey: VALIDATORS[0].pubkey,
      blockHeight: 2_000_000,
    });
    expect(validator1.stakerReward).to.equal(0n);
    expect(validator1.validatorReward).to.equal(1000n);

    const validator4PreMigration = calculateRewardSplit({
      baseRate: 1000n,
      totalDeposited: GENESIS_DEPOSIT + 1000n,
      validatorPubkey: VALIDATORS[3].pubkey,
      blockHeight: DISTRIBUTION_CHANGE_BLOCK - 1,
    });
    expect(validator4PreMigration.stakerReward).to.equal(931n);

    const validator4PostMigration = calculateRewardSplit({
      baseRate: 1000n,
      totalDeposited: GENESIS_DEPOSIT + 1000n,
      validatorPubkey: VALIDATORS[3].pubkey,
      blockHeight: DISTRIBUTION_CHANGE_BLOCK,
    });
    expect(validator4PostMigration.stakerReward).to.equal(0n);
  });

  it("redistributes direct deposits away from full validators", () => {
    const assignments = calculateDirectDepositAssignments({
      amount: 1000n,
      blockHeight: 2_000_000,
      states: [
        {
          validatorInfo: VALIDATORS[0],
          totalDeposited: 10_000_000n * 10n ** 18n,
          outstandingFatBERA: 0n,
        },
        {
          validatorInfo: VALIDATORS[1],
          totalDeposited: 0n,
          outstandingFatBERA: 0n,
        },
        {
          validatorInfo: VALIDATORS[2],
          totalDeposited: 0n,
          outstandingFatBERA: 0n,
        },
      ],
    });

    expect(assignments.find((entry) => entry.index === 0)?.shareToAdd).to.equal(0n);
    expect(assignments.find((entry) => entry.index === 1)?.shareToAdd).to.equal(700n);
    expect(assignments.find((entry) => entry.index === 2)?.shareToAdd).to.equal(300n);
  });

  it("redistributes router overflow across non-target validators", () => {
    const assignments = calculateRouterRedistributionAssignments({
      amountToRedistribute: 1000n,
      blockHeight: 2_000_000,
      targetValidatorIndex: 0,
      states: [
        {
          validatorInfo: VALIDATORS[0],
          totalDeposited: 0n,
          outstandingFatBERA: 0n,
        },
        {
          validatorInfo: VALIDATORS[1],
          totalDeposited: 0n,
          outstandingFatBERA: 0n,
        },
        {
          validatorInfo: VALIDATORS[2],
          totalDeposited: 0n,
          outstandingFatBERA: 0n,
        },
      ],
    });

    expect(assignments).to.have.length(2);
    expect(assignments.find((entry) => entry.validatorInfo.pubkey === VALIDATORS[1].pubkey)?.shareToAdd).to.equal(700n);
    expect(assignments.find((entry) => entry.validatorInfo.pubkey === VALIDATORS[2].pubkey)?.shareToAdd).to.equal(300n);
  });
});
