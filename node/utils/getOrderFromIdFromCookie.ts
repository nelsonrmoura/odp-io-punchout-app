export const CHECKOUT_COOKIE = 'checkout.vtex.com'

export function getOrderFormIdFromCookie(cookies: Context['cookies']) {
  const cookie = cookies.get(CHECKOUT_COOKIE)

  return cookie?.split('=')[1]
}
