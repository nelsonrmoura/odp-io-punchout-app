import type { IOContext, InstanceOptions } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class SkuReferenceClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.workspace}--${ctx.account}.myvtex.com`, ctx, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-vtex-use-https': 'true',
        ...(ctx.storeUserAuthToken
          ? {
              VtexIdclientAutCookie: ctx.storeUserAuthToken,
            }
          : {}),
      },
      timeout: 10000,
    })
  }

  public getSkuReference = async (
    vendorSku: string,
    productXref: string,
    sessionToken: string,
    segmentToken: string
  ) => {
    try {
      // TODO: Need to validate the exact endpoint and the responce with VTEX
      const response = await this.http.get<{
        VendorSkuId: string
        SkuId: string
      }>(`/_v/skuReference/${productXref}/${vendorSku}`, {
        headers: {
          Cookie: `vtex_segment=${segmentToken};vtex_session=${sessionToken};`,
        },
      })

      if (!response.SkuId || response.SkuId === '') {
        return {
          vendorSkuId: vendorSku,
          skuId: vendorSku,
        }
      }

      return {
        vendorSkuId: response.VendorSkuId,
        skuId: response.SkuId,
      }
    } catch (error) {
      console.error(error)

      return {
        vendorSkuId: vendorSku,
        skuId: vendorSku,
      }
    }
  }
}
