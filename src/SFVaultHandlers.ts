/*
 * SF Vaults - Dedicated Event Handler Entry Point
 *
 * This file is used for testing SF vaults in isolation.
 * It only imports SF vault handlers to avoid type errors from other contracts.
 */

// Set & Forgetti vault handlers
import {
  handleSFVaultDeposit,
  handleSFVaultWithdraw,
  handleSFVaultStrategyUpdated,
  handleSFMultiRewardsStaked,
  handleSFMultiRewardsWithdrawn,
  handleSFMultiRewardsRewardPaid,
} from "./handlers/sf-vaults";

// Export all SF vault handlers
export { handleSFVaultDeposit };
export { handleSFVaultWithdraw };
export { handleSFVaultStrategyUpdated };
export { handleSFMultiRewardsStaked };
export { handleSFMultiRewardsWithdrawn };
export { handleSFMultiRewardsRewardPaid };
