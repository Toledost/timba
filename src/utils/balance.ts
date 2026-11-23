import { SessionPlayer, Transaction } from '../types';

/**
 * Compute the total sum of all player balances.
 * In a valid zero-sum session this should always be 0.
 */
export function getTotalBalance(players: SessionPlayer[]): number {
  return players.reduce((sum, p) => sum + p.balance, 0);
}

/**
 * Returns true if all balances sum to zero (within a small floating-point tolerance).
 */
export function validateZeroSum(players: SessionPlayer[]): boolean {
  const total = getTotalBalance(players);
  return Math.abs(total) < 0.001;
}

/**
 * Returns the imbalance amount (non-zero means something is wrong).
 */
export function getImbalance(players: SessionPlayer[]): number {
  return getTotalBalance(players);
}

/**
 * Compute the game value from denominations and multiplier.
 * Default: (50*5 + 25*5 + 10*5 + 5*5 + 1*5) * 10 = 455 * 10 = 4550
 */
export function computeGameValue(
  denominations: { value: number; count: number }[],
  multiplier: number
): number {
  const base = denominations.reduce((sum, d) => sum + d.value * d.count, 0);
  return base * multiplier;
}

/**
 * Apply a transaction to a players array (immutable).
 */
export function applyTransaction(
  players: SessionPlayer[],
  tx: Transaction
): SessionPlayer[] {
  return players.map((p) => {
    if (p.playerId === tx.fromPlayerId) {
      return { ...p, balance: p.balance - tx.amount };
    }
    if (p.playerId === tx.toPlayerId) {
      return { ...p, balance: p.balance + tx.amount };
    }
    return p;
  });
}

/**
 * Reverse a transaction (undo).
 */
export function reverseTransaction(
  players: SessionPlayer[],
  tx: Transaction
): SessionPlayer[] {
  return players.map((p) => {
    if (p.playerId === tx.fromPlayerId) {
      return { ...p, balance: p.balance + tx.amount };
    }
    if (p.playerId === tx.toPlayerId) {
      return { ...p, balance: p.balance - tx.amount };
    }
    return p;
  });
}
