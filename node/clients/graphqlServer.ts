/* eslint-disable @typescript-eslint/ban-types */
import type { InstanceOptions, IOContext, Serializable } from '@vtex/api'
import { AppClient, GraphQLClient } from '@vtex/api'

import type { QueryParams } from '../typings/graphqlService'

export class GraphQLServer extends AppClient {
  protected graphql: GraphQLClient

  constructor(ctx: IOContext, opts?: InstanceOptions) {
    super('vtex.graphql-server@1.x', ctx, opts)
    this.graphql = new GraphQLClient(this.http)
  }

  public query = async <TResponse extends Serializable, TArgs extends object>({
    query,
    variables,
    extensions,
    config,
  }: QueryParams<TArgs>) => {
    return this.graphql.query<TResponse, TArgs>(
      {
        extensions,
        query,
        variables,
      },
      {
        ...config,
        params: {
          ...config.params,
          locale: this.context.locale,
        },
        url: '/graphql',
      }
    )
  }
}
