import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

interface SkuTranslateMapping {
  input: string
  output: string
  found: boolean
}

export interface SkuTranslateResponse {
  mappings: SkuTranslateMapping[]
}

/**
 * Client for Railway-hosted ODP APIs (SKU Translation + Debug Webhook).
 *
 * Must use VTEX IO ExternalClient because the IO runtime blocks raw Node.js
 * http/https outbound calls on published apps.
 *
 * Base URL: Railway procurement app domain.
 * All Railway API calls use relative paths so ExternalClient resolves them
 * against the base URL and validates outbound-access policy.
 */
export class OdpSkuTranslateClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super('http://odp-procurement-app-production.up.railway.app', ctx, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-vtex-use-https': 'true',
      },
      timeout: 10000,
    })
  }

  public async translateSkus(
    _apiUrl: string,
    direction: 'odp-to-vtex' | 'vtex-to-odp',
    skuIds: string[]
  ): Promise<SkuTranslateResponse> {
    if (!skuIds.length) {
      return { mappings: [] }
    }

    return this.http.post<SkuTranslateResponse>(
      '/api/sku-translate',
      { direction, skuIds }
    )
  }

  public async sendDebugEvent(
    _webhookUrl: string,
    payload: unknown,
    secret?: string
  ): Promise<void> {
    try {
      await this.http.post(
        '/api/debug-event',
        payload,
        {
          headers: {
            ...(secret ? { 'X-Webhook-Secret': secret } : {}),
          },
        }
      )
    } catch {
      // Fire-and-forget — never break the main flow
    }
  }
}

/**
 * Client for VTEX Catalog API.
 * Used to look up product LinkId for PDP redirect URLs.
 */
export class CatalogClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(
      `http://${ctx.account}.vtexcommercestable.com.br`,
      ctx,
      {
        ...options,
        headers: {
          ...options?.headers,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(ctx.authToken
            ? { VtexIdclientAutCookie: ctx.authToken }
            : {}),
          'x-vtex-use-https': 'true',
        },
        timeout: 8000,
      }
    )
  }

  public async getProduct(
    productId: string
  ): Promise<{ LinkId: string; Name: string; Id: number } | null> {
    try {
      return await this.http.get<{ LinkId: string; Name: string; Id: number }>(
        `/api/catalog/pvt/product/${productId}`
      )
    } catch {
      return null
    }
  }
}
