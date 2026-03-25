import type { IOContext } from '@vtex/api'
import { IOClients } from '@vtex/api'

import { Checkout } from './checkout'
import { VtexIdClient } from './vtexId'
import { MasterDataExtended } from './MasterDataIndex'
import { SearchGraphQL } from './SearchGraphQL'
import { VtexIdPunchOutClient } from './vtexIdPunchout'
import { WebMethods } from './odpWebMethods'
import { VtexAuthValidatorClient } from './vtexAuthValidator'
import { VtexB2bOrgUnitClient } from './VtexB2BOrgUnitClient'
import { CustomLicenseManager } from './customLicenseManger'
import { SkuReferenceClient } from './skuReference'
import { SessionClient } from './session'
import { OdpSkuTranslateClient, CatalogClient } from './odpSkuTranslate'

export class Clients extends IOClients {
  public get checkout() {
    return this.getOrSet('checkout', Checkout)
  }

  public get vtexId() {
    return this.getOrSet('vtexId', VtexIdClient)
  }

  public get vtexIdPunchOut() {
    return this.getOrSet('vtexIdPunchOut', VtexIdPunchOutClient)
  }

  public get search() {
    return this.getOrSet('search', SearchGraphQL)
  }

  public get masterDataExtended() {
    return this.getOrSet('masterDataExtended', MasterDataExtended)
  }

  public get webMethods() {
    return this.getOrSet('webMethods', WebMethods)
  }

  public get vtexAuthValidator() {
    return this.getOrSet('vtexAuthValidator', VtexAuthValidatorClient)
  }

  public get vtexB2bOrgUnit() {
    return this.getOrSet('vtexB2BOrgUnit', VtexB2bOrgUnitClient)
  }

  public get customLicenseManager() {
    return this.getOrSet('customLicenseManager', CustomLicenseManager)
  }

  public get skuReference() {
    return this.getOrSet('skuReference', SkuReferenceClient)
  }

  public get extendedSession() {
    return this.getOrSet('extendedSession', SessionClient)
  }

  public get odpSkuTranslate() {
    return this.getOrSet('odpSkuTranslate', OdpSkuTranslateClient)
  }

  public get catalog() {
    return this.getOrSet('catalog', CatalogClient)
  }
}

export const getTokenToHeader = (ctx: IOContext) => {
  const adminToken = ctx.authToken
  const userToken = ctx.storeUserAuthToken
  const { sessionToken, account } = ctx

  let allCookies = `VtexIdclientAutCookie=${adminToken}`

  if (userToken) {
    allCookies += `; VtexIdclientAutCookie_${account}=${userToken}`
  }

  return {
    'x-vtex-credential': ctx.authToken,
    VtexIdclientAutCookie: adminToken,
    cookie: allCookies,
    ...(sessionToken && {
      'x-vtex-session': sessionToken,
    }),
  }
}
