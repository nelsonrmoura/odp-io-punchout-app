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
}
