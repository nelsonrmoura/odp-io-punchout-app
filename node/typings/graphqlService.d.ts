import type { RequestConfig } from '@vtex/api'

interface GraphQLExtensions {
  persistedQuery?: {
    provider: string
    sender: string
  }
}

interface QueryParams<TArgs> {
  query: string
  variables: TArgs
  extensions: GraphQLExtensions
  config: RequestConfig
}
