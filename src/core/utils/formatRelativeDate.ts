const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * ISO-8601 → "3d ago". `now` is injectable so tests are deterministic
 * without faking timers.
 */
export const formatRelativeDate = (iso: string, now: number = Date.now()): string => {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diff = Math.max(0, now - timestamp);
  if (diff < MINUTE) {
    return 'just now';
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)}m ago`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)}h ago`;
  }
  if (diff < WEEK) {
    return `${Math.floor(diff / DAY)}d ago`;
  }
  if (diff < 4 * WEEK) {
    return `${Math.floor(diff / WEEK)}w ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
