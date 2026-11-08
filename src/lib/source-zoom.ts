/** Keep narrow source readers capable of displaying at least the delivered image's native detail. */
export const MIN_SOURCE_ZOOM = 70;
export function maxSourceZoom(availableWidth: number, imageWidth = 1100): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return 200;
  const nativeWidth = Number.isFinite(imageWidth) && imageWidth > 0 ? imageWidth : 1100;
  const readingWidth = Math.max(1200, nativeWidth * 1.25);
  return Math.min(800, Math.max(200, Math.ceil(readingWidth / availableWidth * 100 / 20) * 20));
}

/** Preserve fine steps around page-fit, with larger steps for close reading on small screens. */
export function stepSourceZoom(current: number, direction: -1 | 1, maximum: number): number {
  const step = (current > 200 || current === 200 && direction > 0) && maximum > 200 ? 50 : 20;
  const next = current + direction * step;
  return Math.max(MIN_SOURCE_ZOOM, Math.min(maximum, direction < 0 && current > 200 ? Math.max(200, next) : next));
}
