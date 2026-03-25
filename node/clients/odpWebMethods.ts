import type { IOContext, InstanceOptions } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class WebMethods extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(
      'http://b2btest.odpbusiness.com',
      ctx,
      {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-vtex-use-https': 'true',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'Origin, X-Requested-With, Content-Type, Accept, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      }
    )
  }

  private validateTokenRequest(body: TokenRequest): void {
    if (!body?.TokenRequest?.userId) {
      throw new Error('Invalid token request: userId is required')
    }
  }

  public async getToken(settings: AppSettings) {
    const credentials = Buffer.from(
      `${settings.punchOutWebMethodsUserId}:${settings.punchOutWebMethodsPassword}`
    ).toString('base64')

    const requestBody: TokenRequest = {
      TokenRequest: {
        userId: 'vtexServiceUser',
      },
    }

    this.validateTokenRequest(requestBody)

    return this.http.post<TokenResponse>('/api/v1/getToken', requestBody, {
      headers: {
        ...this.options?.headers,
        Authorization: `Basic ${credentials}`,
      },
      metric: 'webMethods-getToken',
    })
  }

  public async getTransformedOrderMessage(
    cart: TransferCartRequest,
    token: string
  ) {
    console.info('cart', JSON.stringify(cart, null, 2))
    const response = await this.http.post<TransferCartResponse>(
      'api/v1/shoppingCart',
      cart,
      {
        headers: {
          ...this.options?.headers,
          Authorization: `Bearer ${token}`,
        },
        metric: 'webMethods-transferCart',
      }
    )

    const decoded = Buffer.from(
      response?.shoppingCartResponse?.shoppingCart,
      'base64'
    ).toString('utf-8')

    console.info('decoded', JSON.stringify(decoded, null, 2))

    return decoded
  }
}
