import type {
  InstanceOptions,
  IOContext,
  RequestTracingConfig,
} from '@vtex/api'
import { ExternalClient } from '@vtex/api'

const routes = {
  index: (dataEntity: string, name: string) => `${dataEntity}/indices/${name}`,
  indices: (dataEntity: string) => `${dataEntity}/indices`,
  schema: (dataEntity: string, name: string) => `${dataEntity}/schemas/${name}`,
}

export class MasterDataExtended extends ExternalClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super('http://api.vtex.com/api/dataentities', ctx, {
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

  public getIndex<T>(
    { dataEntity, name }: GetIndexInput,
    tracingConfig?: RequestTracingConfig
  ) {
    const metric = 'masterdata-getIndex'

    return this.http.get<T>(routes.index(dataEntity, name), {
      metric,
      tracing: {
        requestSpanNameSuffix: metric,
        ...tracingConfig?.tracing,
      },
    })
  }

  public createOrUpdateIndex<T>(
    { dataEntity, name, multiple, fields }: CreateIndexInput,
    tracingConfig?: RequestTracingConfig
  ) {
    const metric = 'masterdata-createOrUpdateIndex'

    return this.http.put<T>(
      routes.indices(dataEntity),
      {
        name,
        multiple,
        fields,
      },
      {
        metric,
        tracing: {
          requestSpanNameSuffix: metric,
          ...tracingConfig?.tracing,
        },
      }
    )
  }

  public createOrUpdateSchema<T>(
    { dataEntity, name, schema }: CreateSchemaInput,
    tracingConfig?: RequestTracingConfig
  ) {
    const metric = 'masterdata-createOrUpdateSchema'

    return this.http.put<T>(routes.schema(dataEntity, name), schema, {
      metric,
      tracing: {
        requestSpanNameSuffix: metric,
        ...tracingConfig?.tracing,
      },
    })
  }
}
