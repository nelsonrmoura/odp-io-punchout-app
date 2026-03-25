import { AuthenticationError, ForbiddenError, UserInputError } from '@vtex/api'
import type { AxiosError } from 'axios'
import { compose } from 'ramda'
import type { SetOption } from 'cookies'
import { parse } from 'set-cookie-parser'

import { CHECKOUT_COOKIE, ASPXAUTH_COOKIE, OWNERSHIP_COOKIE } from './consts'

const ALL_SET_COOKIES = [CHECKOUT_COOKIE, ASPXAUTH_COOKIE, OWNERSHIP_COOKIE]

interface ParsedCookie {
  name: string
  value: string
  options: SetOption
}

export function statusToError(e: unknown) {
  if (!isAxiosError(e)) {
    throw e
  }

  const { response } = e

  if (!response) {
    throw e
  }

  const { status } = response

  if (status === 401) {
    throw new AuthenticationError(e)
  }

  if (status === 403) {
    throw new ForbiddenError(e)
  }

  if (status === 400) {
    throw new UserInputError(e)
  }

  throw e
}

// Type guard to check if error is AxiosError
function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).response !== undefined
}

const filterAllowedCookies = (setCookies: string[], allowList: string[]) => {
  return setCookies.filter((setCookie) => {
    const [key] = setCookie.split('=')

    return allowList.includes(key)
  })
}

const replaceDomain = (host: string) => (cookie: string) =>
  cookie.replace(/domain=.+?(;|$)/, `domain=${host};`)

const parseCookie = (cookie: string): ParsedCookie => {
  const [parsed] = parse(cookie)

  const cookieName = parsed.name
  const cookieValue = parsed.value

  const extraOptions: SetOption = {
    path: parsed.path,
    domain: parsed.domain,
    expires: parsed.expires,
    httpOnly: true,
    secure: parsed.secure,
    sameSite: parsed.sameSite as 'strict' | 'lax' | undefined,
  }

  return {
    name: cookieName,
    value: cookieValue,
    options: extraOptions,
  }
}

export async function forwardCheckoutCookies(
  rawHeaders: Record<string, any>,
  ctx: Context,
  allowList: string[] = ALL_SET_COOKIES
) {
  const responseSetCookies: string[] = rawHeaders?.['set-cookie'] ?? []

  const host = ctx.get('x-forwarded-host')
  const forwardedSetCookies = filterAllowedCookies(
    responseSetCookies,
    allowList
  )

  const parseAndClean = compose(parseCookie, replaceDomain(host))
  const cleanCookies = forwardedSetCookies.map(parseAndClean)

  cleanCookies.forEach(({ name, value, options }) => {
    if (options.secure && !ctx.cookies.secure) {
      ctx.cookies.secure = true
    }

    ctx.cookies.set(name, value, options)
  })
}

export function checkoutCookieFormat(orderFormId: string) {
  return `${CHECKOUT_COOKIE}=__ofid=${orderFormId};`
}

export function ownershipCookieFormat(ownerId: string) {
  return `${OWNERSHIP_COOKIE}=${ownerId};`
}

export async function forwardSessionCookies(
  rawHeaders: Record<string, any>,
  ctx: Context,
  allowList: string[] = []
) {
  const responseSetCookies: string[] = rawHeaders?.['set-cookie'] ?? []

  const host = `.${ctx.get('x-forwarded-host')}`
  const forwardedSetCookies = filterAllowedCookies(
    responseSetCookies,
    allowList
  )

  const parseAndClean = compose(parseCookie, replaceDomain(host))
  const cleanCookies = forwardedSetCookies.map(parseAndClean)

  cleanCookies.forEach(({ name, value, options }) => {
    if (options.secure && !ctx.cookies.secure) {
      ctx.cookies.secure = true
    }

    ctx.cookies.set(name, value, options)
    if (name === 'vtex_session') {
      ctx.state.sessionToken = value
    }

    if (name === 'vtex_segment') {
      ctx.state.segmentToken = value
    }
  })
}
