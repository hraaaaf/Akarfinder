// Polite, non-aggressive delay between requests (default 5–10 seconds).

export function randomDelayMs(minMs = 5000, maxMs = 10000): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

export function safeDelay(minMs = 5000, maxMs = 10000): Promise<void> {
  const ms = randomDelayMs(minMs, maxMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
