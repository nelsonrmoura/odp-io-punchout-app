import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

export class VtexB2bOrgUnitClient extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(`http://${ctx.account}.myvtex.com`, ctx, {
      ...options,
      headers: {
        ...options?.headers,
        ...(ctx.authToken ? { VtexIdclientAutCookie: ctx.authToken } : {}),
        'x-vtex-use-https': 'true',
      },
    })
  }

  public getOrganizationByName = async (name: string) => {
    const response = await this.http.get<OrganizationUnit[]>(
      this.routes.getOrganizationByName(name)
    )

    return response
  }

  public getScopesByContract = async (scope: string, contractId: string) => {
    const response = await this.http.get<ContractScope[]>(
      this.routes.getScopesByContract(scope, contractId)
    )

    return response
  }

  public getScopesByContractNoCache = async (
    scope: string,
    contractId: string,
    attempt: number
  ) => {
    const response = await this.http.get<ContractScope[]>(
      this.routes.getScopesByContract(scope, contractId) +
        `?_retry=${attempt}&_t=${Date.now()}`,
      { cacheable: undefined } as Record<string, unknown>
    )

    return response
  }

  public getOrganizationUserByOrgUnitId = async (unitId: string) => {
    const response = await this.http.get<ListOrganizationUserResponse>(
      this.routes.getOrganizationUserByOrgUnitId(unitId)
    )

    return response
  }

  public addUserToOrganization = async (unitId: string, userId: string) => {
    const response = await this.http.post(
      this.routes.addUserToOrganization(unitId),
      {
        userIds: [userId],
      }
    )

    return response
  }

  private get routes() {
    return {
      getOrganizationByName: (name: string) =>
        `/api/organization-units/v1/?name=${name}&page=1&pageSize=10`,
      getOrganizationUserByOrgUnitId: (unitId: string) =>
        `/api/vtexid/organization-units/${unitId}/users`,
      addUserToOrganization: (unitId: string) =>
        `/api/vtexid/organization-units/${unitId}/users`,
      getScopesByContract: (scope: string, contractId: string) =>
        `/api/organization-units/v1/scope/${scope}/value/${contractId}`,
    }
  }
}
