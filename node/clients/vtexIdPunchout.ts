import type { IOContext, InstanceOptions, RequestConfig } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

import { statusToError } from '../utils'

export class VtexIdPunchOutClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.workspace}--${ctx.account}.myvtex.com`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        'x-vtex-use-https': 'true',
        'x-vtex-proxy-to': `https://${ctx.workspace}--${ctx.account}.myvtex.com`,
      },
    })
  }

  public startAuth = async ({
    username,
    returnUrl,
    key,
    token,
    baseDomain,
  }: {
    username: string
    returnUrl: string
    key: string
    token: string
    baseDomain: string
  }) => {
    try {
      const postResponse = await this.post<AuthStartResponse>(
        `http://${baseDomain}/api/authenticator/punchout/authenticated/start`,
        {
          username,
        },
        {
          params: {
            returnURL: returnUrl,
          },
          headers: {
            'X-VTEX-API-AppKey': key,
            'X-VTEX-API-AppToken': token,
          },
        }
      )

      return postResponse
    } catch (error) {
      this.context.logger.error(`[startAuth] error : ${error.message}`)

      return {
        url: '',
      } as AuthStartResponse
    }
  }

  protected post = <T>(
    url: string,
    data?: Record<string, unknown>,
    config: RequestConfig = {}
  ) => {
    config.headers = {
      ...config.headers,
    }

    return this.http
      .post<T>(url, data, config)
      .catch(statusToError) as Promise<T>
  }
}
