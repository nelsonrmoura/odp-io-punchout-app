import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class CustomLicenseManager extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.account}.vtexcommercestable.com.br`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        ...(ctx.authToken ? { VtexIdclientAutCookie: ctx.authToken } : {}),
        'x-vtex-use-https': 'true',
      },
    })
  }

  public createUser = async (
    email: string,
    name: string
  ): Promise<CreateLicenseManagerUserResponse> => {
    return this.http.post(this.routes.createUser, {
      email,
      name,
    })
  }

  protected get routes() {
    return {
      createUser: '/api/license-manager/users',
    }
  }
}
