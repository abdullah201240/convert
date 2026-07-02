/**
 * Formats a number of bytes into a human-readable size string.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Calculates size reduction percentage.
 */
export function calculateReduction(original: number, converted: number): number {
  if (original === 0) return 0;
  const reduction = ((original - converted) / original) * 100;
  return parseFloat(reduction.toFixed(1));
}

/**
 * Safely generates a unique ID, falling back to a timestamped random string if crypto.randomUUID
 * is not available (e.g., in non-secure HTTP contexts on custom local network IPs).
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
