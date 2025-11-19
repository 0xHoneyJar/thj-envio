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

// Import Henlo token handlers (burns + holder tracking)
import { handleHenloBurn } from "./handlers/henlo-burns";

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
  handleSFMultiRewardsStaked,
  handleSFMultiRewardsWithdrawn,
  handleSFMultiRewardsRewardPaid,
} from "./handlers/sf-vaults";

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

// Mibera staking tracking (PaddleFi & Jiko)
import { handleMiberaStakingTransfer } from "./handlers/mibera-staking";

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

// Henlo token handlers (burns + holder tracking)
export { handleHenloBurn };

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
export { handleSFMultiRewardsStaked };
export { handleSFMultiRewardsWithdrawn };
export { handleSFMultiRewardsRewardPaid };

// Trading system handlers
// TODO: Fix TypeScript errors in trade handlers before uncommenting
// export { handleMiberaTradeProposed };
// export { handleMiberaTradeAccepted };
// export { handleMiberaTradeCancelled };
// export { handleCandiesTradeProposed };
// export { handleCandiesTradeAccepted };
// export { handleCandiesTradeCancelled };

// Mibera staking handlers
export { handleMiberaStakingTransfer };
