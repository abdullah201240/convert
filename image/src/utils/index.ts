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
