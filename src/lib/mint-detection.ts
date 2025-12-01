/*
 * Shared mint and burn detection utilities for THJ indexer.
 *
 * Centralizes logic for detecting mints, burns, and airdrops across
 * ERC-721 and ERC-1155 handlers.
 */

import { ZERO_ADDRESS } from "../handlers/constants";

// Common burn address used by many projects
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

/**
 * Check if transfer is a mint (from zero address)
 */
export function isMintFromZero(fromAddress: string): boolean {
  return fromAddress.toLowerCase() === ZERO_ADDRESS;
}

/**
 * Check if transfer is a mint or airdrop (from zero OR from specified airdrop wallets)
 * Use this when a collection has a distribution wallet that airdrops tokens.
 */
export function isMintOrAirdrop(
  fromAddress: string,
  airdropWallets?: Set<string>
): boolean {
  const lower = fromAddress.toLowerCase();
  if (lower === ZERO_ADDRESS) {
    return true;
  }
  return airdropWallets?.has(lower) ?? false;
}

/**
 * Check if an address is a burn destination (zero or dead address)
 */
export function isBurnAddress(address: string): boolean {
  const lower = address.toLowerCase();
  return lower === ZERO_ADDRESS || lower === DEAD_ADDRESS;
}

/**
 * Check if transfer is a burn (to burn address, not from zero)
 * Excludes mints to burn address which would be unusual but technically possible.
 */
export function isBurnTransfer(fromAddress: string, toAddress: string): boolean {
  return !isMintFromZero(fromAddress) && isBurnAddress(toAddress);
}
