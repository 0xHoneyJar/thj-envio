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

// Import Aquabera direct vault handlers
import {
  handleDirectDeposit,
  handleDirectWithdraw,
} from "./handlers/aquabera-vault-direct";

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
