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
  handleSFStrategyMultiRewardsUpdated,
  handleSFMultiRewardsStaked,
  handleSFMultiRewardsWithdrawn,
  handleSFMultiRewardsRewardPaid,
  handleSFMultiRewardsRebatePaid,
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

// Mibera Liquid Backing handlers (loans, RFV, defaulted NFT marketplace)
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
} from "./handlers/mibera-liquid-backing";

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

// Mirror Observability handlers (article purchases on Optimism)
import { handleWritingEditionPurchased } from "./handlers/mirror-observability";

// friend.tech handlers (key trading on Base)
import { handleFriendtechTrade } from "./handlers/friendtech";

// Seaport marketplace handlers (secondary sales tracking)
import { handleSeaportOrderFulfilled } from "./handlers/seaport";

// APDAO Auction House handlers (auction lifecycle + queue management)
import {
  handleAuctionCreated,
  handleAuctionBid,
  handleAuctionExtended,
  handleAuctionSettled,
  handleTokensAddedToQueue,
  handleTokensRemovedFromQueue,
} from "./handlers/apdao-auction";

// PaddleFi lending handlers (BERA supply + NFT pawn + liquidations)
import {
  handlePaddleMint,
  handlePaddlePawn,
  handlePaddleLiquidateBorrow,
} from "./handlers/paddlefi";

// Trading system handlers - ARCHIVED
// Status: Handlers moved to grimoires/loa/archive/wip-handlers/
// Blockers:
//   - mibera-trades.ts: MiberaTrade, TradeStats entities not in schema
//   - cargo-trades.ts: CandiesTrade contract not deployed (TBD)
// To reactivate: See grimoires/loa/archive/wip-handlers/README.md

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
export { handleSFStrategyMultiRewardsUpdated };
export { handleSFMultiRewardsStaked };
export { handleSFMultiRewardsWithdrawn };
export { handleSFMultiRewardsRewardPaid };
export { handleSFMultiRewardsRebatePaid };

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

// Trading system handlers - ARCHIVED (see grimoires/loa/archive/wip-handlers/)

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

// Mirror Observability handlers (article purchases on Optimism)
export { handleWritingEditionPurchased };

// friend.tech handlers (key trading on Base)
export { handleFriendtechTrade };

// Seaport marketplace handlers (secondary sales tracking)
export { handleSeaportOrderFulfilled };

// APDAO Auction House handlers (auction lifecycle + queue management)
export { handleAuctionCreated };
export { handleAuctionBid };
export { handleAuctionExtended };
export { handleAuctionSettled };
export { handleTokensAddedToQueue };
export { handleTokensRemovedFromQueue };

// PaddleFi lending handlers (BERA supply + NFT pawn + liquidations)
export { handlePaddleMint };
export { handlePaddlePawn };
export { handlePaddleLiquidateBorrow };
