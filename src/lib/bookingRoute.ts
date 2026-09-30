// A shop-specific link must identify a shop explicitly; never silently send
// customers to a hard-coded business.
export const defaultShopSlug = ''

export function bookingPath(path: 'home' | 'services' | 'barber' | 'date-time' | 'details' | 'confirmation', slug: string) {
  const pathPart = path === 'home' ? '/book' : `/book/${path}`
  return `${pathPart}?shop=${encodeURIComponent(slug)}`
}

export function readShopSlug(search: string) {
  return new URLSearchParams(search).get('shop')?.trim().toLowerCase() || defaultShopSlug
}
