import { generateKeyBetween } from "fractional-indexing";

/**
 * Generate an order key for a new item at the end of a list.
 * @param lastKey - The order key of the last item, or null if the list is empty.
 */
export function generateOrderKeyAfter(lastKey: string | null): string {
  return generateKeyBetween(lastKey, null);
}

/**
 * Generate an order key for a new item at the beginning of a list.
 * @param firstKey - The order key of the first item, or null if the list is empty.
 */
export function generateOrderKeyBefore(firstKey: string | null): string {
  return generateKeyBetween(null, firstKey);
}

/**
 * Generate an order key between two existing keys.
 * @param prevKey - The key of the item before the new position (null for beginning).
 * @param nextKey - The key of the item after the new position (null for end).
 */
export function generateOrderKeyBetween(
  prevKey: string | null,
  nextKey: string | null,
): string {
  return generateKeyBetween(prevKey, nextKey);
}

/**
 * Given a sorted list and a target index, compute the order key for insertion.
 */
export function computeNewOrderKey(
  sortedKeys: string[],
  targetIndex: number,
): string {
  const prev = targetIndex > 0 ? sortedKeys[targetIndex - 1] : null;
  const next = targetIndex < sortedKeys.length ? sortedKeys[targetIndex] : null;
  return generateKeyBetween(prev, next);
}
