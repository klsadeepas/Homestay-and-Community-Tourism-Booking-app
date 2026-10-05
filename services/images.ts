// Image helpers. All remote images are routed through SmartImage; this module
// provides stable fallback and placeholder constants.
export const PLACEHOLDER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export const FALLBACK_ICONS: Record<string, string> = {
  listing: 'image-not-supported',
  village: 'landscape',
  avatar: 'person',
  event: 'event',
};

// Normalize legacy Unsplash URLs that might miss sizing parameters or point to deprecated IDs.
export function normalizeImageUrl(uri?: string): string | undefined {
  if (!uri) return undefined;
  // Map old/broken Unsplash photos to verified active images
  if (uri.includes('photo-1588416499018-d8c621e1d1f0')) {
    return 'https://images.unsplash.com/photo-1546708973-b339540b5162?w=1200&auto=format&fit=crop&q=80';
  }
  if (uri.includes('photo-1575986767340-5d17ae767ab3')) {
    return 'https://images.unsplash.com/photo-1580794749460-76f97b7180d8?w=1200&auto=format&fit=crop&q=80';
  }
  if (uri.includes('photo-1537724841047-5a19bd87e4dd')) {
    return 'https://images.unsplash.com/photo-1705730428836-b54e12aa8ea5?w=1200&auto=format&fit=crop&q=80';
  }
  if (uri.includes('photo-1587874522487-ea017f904c21')) {
    return 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80';
  }
  if (!uri.includes('unsplash.com')) return uri;
  if (uri.includes('?')) return uri;
  return `${uri}?w=1200&auto=format&fit=crop&q=80`;
}
