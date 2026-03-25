import type { InstanceOptions, IOContext } from '@vtex/api'
import DataLoader from 'dataloader'

import { GraphQLServer } from '../graphqlServer'
import type {
  ProductArgs,
  ProductResponse,
  ProductsByIdentifierResponse,
} from './productQuery'
import { query as productQuery } from './productQuery'

const extensions = {
  persistedQuery: {
    provider: 'vtex.search-graphql@0.x',
    sender: 'vtex.checkout-graphql@0.x',
  },
}

export class SearchGraphQL extends GraphQLServer {
  private readonly productLoader: DataLoader<string, ProductResponse>

  constructor(ctx: IOContext, opts?: InstanceOptions) {
    super(ctx, opts)

    this.productLoader = new DataLoader(async (keys) => {
      const { data, errors } = await this.query<
        ProductsByIdentifierResponse,
        ProductArgs
      >({
        query: productQuery,
        variables: { values: [...keys] },
        extensions,
        config: { metric: 'get-product' },
      })

      if (errors && errors.length > 0) {
        const [error] = errors

        this.context.logger.error(`[getProduct] error : ${error.message}`)

        return keys.map(() => error.originalError ?? new Error(error.message))
      }

      return keys.map(
        (id) =>
          data?.productsByIdentifier.find(
            (product) => product.productId === id
          ) ?? new Error('Product not found')
      )
    })
  }

  public product = (productRefId: string) =>
    this.productLoader.load(productRefId)
}
