/**
 * Format a dollar amount with sign and commas.
 * e.g. 4550 → "$4,550", -1000 → "-$1,000", 0 → "$0"
 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

/**
 * Format balance as games equivalent.
 * e.g. 4550 gameValue, balance 9100 → "+2.00 games"
 */
export function formatGames(balance: number, gameValue: number): string {
  if (gameValue === 0) return '0 games';
  const games = balance / gameValue;
  const sign = games > 0 ? '+' : '';
  return `${sign}${games.toFixed(2)}g`;
}

/**
 * Format a timestamp to a readable time string.
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a timestamp to date + time.
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
