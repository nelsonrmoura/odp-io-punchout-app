import type { IOContext, InstanceOptions, RequestConfig } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

import { statusToError } from '../utils'

export class VtexIdClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.account}.vtexcommercestable.com.br`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        ...(ctx.storeUserAuthToken
          ? { VtexIdclientAutCookie: ctx.storeUserAuthToken }
          : null),
        'x-vtex-use-https': 'true',
      },
    })
  }

  public getAuthId = async (token: string): Promise<AuthIdResponse> => {
    try {
      const postResponse = await this.post<AuthIdResponse>(
        '/api/vtexid/credential/validate',
        {
          token,
        }
      )

      return postResponse
    } catch (error) {
      this.context.logger.error(`[getAuthId] error : ${error.message}`)

      return {
        account: this.context.account,
        tokenType: 'admin',
        authStatus: 'Error',
        id: '',
        user: '',
        audience: '',
      } as AuthIdResponse
    }
  }

  public getAuthToken = async (appKey: string, appToken: string) => {
    try {
      const response = await this.post<AppKeyTokenExchangeResponse>(
        '/api/vtexid/apptoken/login',
        {
          appkey: appKey,
          apptoken: appToken,
        }
      )

      return response
    } catch (error) {
      return null
    }
  }

  protected post = <T>(
    url: string,
    data?: unknown,
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
