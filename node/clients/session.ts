import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

const routes = {
  base: '/api/sessions',
}

export class SessionClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.account}.vtexcommercestable.com.br`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        'x-vtex-use-https': 'true',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
  }

  /**
   * Update the public portion of this session
   */
  public updateSession = () => {
    return this.http.postRaw(
      routes.base,
      {},
      {
        headers: {
          Cookie: `VtexIdclientAutCookie_${this.context.account}=${this.context.storeUserAuthToken};`,
        },
        metric: 'session-update-custom',
      }
    )
  }

  /**
   * Patch the session with checkout.orderFormId to trigger the punchout session transform.
   * This writes the orderFormId into the VTEX session so the session framework
   * calls /_v/punchout/session/transform with the correct inputs.
   */
  public patchSessionWithOrderFormId = (
    orderFormId: string,
    sessionCookie: string
  ) => {
    return this.http.postRaw(
      routes.base,
      {
        public: {
          checkout: {
            orderFormId: { value: orderFormId },
          },
        },
      },
      {
        headers: {
          Cookie: [
            `VtexIdclientAutCookie_${this.context.account}=${this.context.storeUserAuthToken}`,
            sessionCookie,
          ].join('; '),
        },
        metric: 'session-patch-orderform',
      }
    )
  }
}
