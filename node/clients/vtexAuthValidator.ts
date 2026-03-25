import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class VtexAuthValidatorClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super('http://api.vtex.com/api/vtexid/pub/authentication/v1', ctx, {
      ...options,
      headers: {
        Accept: 'application/json',
        VtexIdclientAutCookie: ctx.authToken,
        'x-vtex-api-appService': ctx.userAgent,
        ...options?.headers,
      },
      params: {
        an: ctx.account,
        ...options?.params,
      },
    })
  }

  public validateCredentials = async (username: string, password: string) => {
    try {
      // TODO: Need to validate the exact endpoint and the responce with VTEX
      const response = await this.http.post('/validateUser', {
        username,
        password,
      })

      return {
        isValid: true,
        data: response,
        error: '',
      }
    } catch {
      return {
        isValid: true, // TODO: change to false
        error: 'Invalid user',
        data: '',
      }
    }
  }
}
