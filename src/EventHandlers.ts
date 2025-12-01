/*
 * THJ Indexer - Main Event Handler Entry Point
 *
 * This file imports and registers all event handlers from modular files.
 * Each product/feature has its own handler module for better maintainability.
 */

// Import HoneyJar NFT handlers
import {
  handleHoneyJarTransfer,
  handleHoneycombTransfer,
  handleHoneyJar2EthTransfer,
  handleHoneyJar3EthTransfer,
  handleHoneyJar4EthTransfer,
  handleHoneyJar5EthTransfer,
} from "./handlers/honey-jar-nfts";

// Import MoneycombVault handlers
import {
  handleAccountOpened,
  handleAccountClosed,
  handleHJBurned,
  handleSharesMinted,
  handleRewardClaimed,
} from "./handlers/moneycomb-vault";

// Import Aquabera wall tracking handlers (forwarder events)
import {
  handleAquaberaDeposit,
  // handleAquaberaWithdraw, // Not implemented - forwarder doesn't emit withdrawal events
} from "./handlers/aquabera-wall";

// Crayons factory + collections (skeleton)
import { handleCrayonsFactoryNewBase } from "./handlers/crayons";
import { handleCrayonsErc721Transfer } from "./handlers/crayons-collections";
import { handleTrackedErc721Transfer } from "./handlers/tracked-erc721";
// Import Aquabera direct vault handlers
import {
  handleDirectDeposit,
  handleDirectWithdraw,
} from "./handlers/aquabera-vault-direct";
// General mint tracking
import { handleGeneralMintTransfer } from "./handlers/mints";
import { handleVmMinted } from "./handlers/vm-minted";
import {
  handleCandiesMintSingle,
  handleCandiesMintBatch,
} from "./handlers/mints1155";
import { handleFatBeraDeposit } from "./handlers/fatbera";
import { handleBgtQueueBoost } from "./handlers/bgt";
import {
  handleCubBadgesTransferSingle,
  handleCubBadgesTransferBatch,
} from "./handlers/badges1155";

// Set & Forgetti vault handlers
import {
  handleSFVaultDeposit,
  handleSFVaultWithdraw,
  handleSFVaultStrategyUpdated,
  handleSFMultiRewardsStaked,
  handleSFMultiRewardsWithdrawn,
  handleSFMultiRewardsRewardPaid,
} from "./handlers/sf-vaults";

// Tracked ERC-20 token balance handler (HENLO + HENLOCKED tiers)
import { handleTrackedErc20Transfer } from "./handlers/tracked-erc20";

// HenloVault handlers (HENLOCKED token mints + Henlocker vault system)
import {
  handleHenloVaultMint,
  handleHenloVaultRoundOpened,
  handleHenloVaultRoundClosed,
  handleHenloVaultDepositsPaused,
  handleHenloVaultDepositsUnpaused,
  handleHenloVaultMintFromReservoir,
  handleHenloVaultRedeem,
  handleHenloVaultReservoirSet,
} from "./handlers/henlo-vault";

// Mibera Treasury handlers (defaulted NFT marketplace + loan system)
import {
  handleLoanReceived,
  handleBackingLoanPayedBack,
  handleBackingLoanExpired,
  handleItemLoaned,
  handleLoanItemSentBack,
  handleItemLoanExpired,
  handleItemPurchased,
  handleItemRedeemed,
  handleRFVChanged,
} from "./handlers/mibera-treasury";

// Mibera Collection handlers (transfer/mint/burn tracking)
import { handleMiberaCollectionTransfer } from "./handlers/mibera-collection";

// Milady Collection handlers (burn tracking on ETH mainnet)
import { handleMiladyCollectionTransfer } from "./handlers/milady-collection";

// Mibera Premint handlers (participation/refund tracking)
import {
  handlePremintParticipated,
  handlePremintRefunded,
} from "./handlers/mibera-premint";

// Mibera Sets handlers (ERC-1155 on Optimism)
import {
  handleMiberaSetsSingle,
  handleMiberaSetsBatch,
} from "./handlers/mibera-sets";

// Mibera Zora handlers (ERC-1155 on Optimism via Zora platform)
import {
  handleMiberaZoraSingle,
  handleMiberaZoraBatch,
} from "./handlers/mibera-zora";

// friend.tech handlers (key trading on Base)
import { handleFriendtechTrade } from "./handlers/friendtech";

// Trading system handlers
// TODO: Fix TypeScript errors in trade handlers before uncommenting
// import {
//   handleMiberaTradeProposed,
//   handleMiberaTradeAccepted,
//   handleMiberaTradeCancelled,
// } from "./handlers/mibera-trades";
// import {
//   handleCandiesTradeProposed,
//   handleCandiesTradeAccepted,
//   handleCandiesTradeCancelled,
// } from "./handlers/cargo-trades";

// Mibera staking tracking - REMOVED: Now handled by TrackedErc721 handler
// import { handleMiberaStakingTransfer } from "./handlers/mibera-staking";

/*
 * Export all handlers for Envio to register
 *
 * The handlers are already defined with their event bindings in the module files.
 * This re-export makes them available to Envio's event processing system.
 */

// HoneyJar NFT Transfer handlers
export { handleHoneyJarTransfer };
export { handleHoneycombTransfer };
export { handleHoneyJar2EthTransfer };
export { handleHoneyJar3EthTransfer };
export { handleHoneyJar4EthTransfer };
export { handleHoneyJar5EthTransfer };

// MoneycombVault handlers
export { handleAccountOpened };
export { handleAccountClosed };
export { handleHJBurned };
export { handleSharesMinted };
export { handleRewardClaimed };

// Aquabera wall tracking handlers (forwarder)
export { handleAquaberaDeposit };
// export { handleAquaberaWithdraw }; // Not implemented - forwarder doesn't emit withdrawal events

// Aquabera direct vault handlers
export { handleDirectDeposit };
export { handleDirectWithdraw };

// Crayons handlers
export { handleCrayonsFactoryNewBase };
export { handleCrayonsErc721Transfer };
export { handleTrackedErc721Transfer };

// General mint handlers
export { handleGeneralMintTransfer };
export { handleVmMinted };
export { handleCandiesMintSingle };
export { handleCandiesMintBatch };
export { handleFatBeraDeposit };
export { handleBgtQueueBoost };
export { handleCubBadgesTransferSingle };
export { handleCubBadgesTransferBatch };

// Set & Forgetti vault handlers
export { handleSFVaultDeposit };
export { handleSFVaultWithdraw };
export { handleSFVaultStrategyUpdated };
export { handleSFMultiRewardsStaked };
export { handleSFMultiRewardsWithdrawn };
export { handleSFMultiRewardsRewardPaid };

// Tracked ERC-20 token balance handler
export { handleTrackedErc20Transfer };

// HenloVault handlers (HENLOCKED token mints + Henlocker vault system)
export { handleHenloVaultMint };
export { handleHenloVaultRoundOpened };
export { handleHenloVaultRoundClosed };
export { handleHenloVaultDepositsPaused };
export { handleHenloVaultDepositsUnpaused };
export { handleHenloVaultMintFromReservoir };
export { handleHenloVaultRedeem };
export { handleHenloVaultReservoirSet };

// Trading system handlers
// TODO: Fix TypeScript errors in trade handlers before uncommenting
// export { handleMiberaTradeProposed };
// export { handleMiberaTradeAccepted };
// export { handleMiberaTradeCancelled };
// export { handleCandiesTradeProposed };
// export { handleCandiesTradeAccepted };
// export { handleCandiesTradeCancelled };

// Mibera staking handlers - REMOVED: Now handled by TrackedErc721 handler
// export { handleMiberaStakingTransfer };

// Mibera Treasury handlers (defaulted NFT marketplace + loan system)
export { handleLoanReceived };
export { handleBackingLoanPayedBack };
export { handleBackingLoanExpired };
export { handleItemLoaned };
export { handleLoanItemSentBack };
export { handleItemLoanExpired };
export { handleItemPurchased };
export { handleItemRedeemed };
export { handleRFVChanged };

// Mibera Collection handlers (transfer/mint/burn tracking)
export { handleMiberaCollectionTransfer };

// Milady Collection handlers (burn tracking on ETH mainnet)
export { handleMiladyCollectionTransfer };

// Mibera Premint handlers (participation/refund tracking)
export { handlePremintParticipated };
export { handlePremintRefunded };

// Mibera Sets handlers (ERC-1155 on Optimism)
export { handleMiberaSetsSingle };
export { handleMiberaSetsBatch };

// Mibera Zora handlers (ERC-1155 on Optimism via Zora platform)
export { handleMiberaZoraSingle };
export { handleMiberaZoraBatch };

// friend.tech handlers (key trading on Base)
export { handleFriendtechTrade };
