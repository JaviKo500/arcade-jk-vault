const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 3;

const submissions = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissions.get(ip) ?? []).filter(
    (ts) => now - ts < WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS) {
    submissions.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  submissions.set(ip, timestamps);
  return false;
}
