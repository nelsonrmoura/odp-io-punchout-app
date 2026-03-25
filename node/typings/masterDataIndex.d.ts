interface GetIndexInput {
  dataEntity: string
  name: string
}

interface CreateIndexInput {
  dataEntity: string
  name: string
  multiple: boolean
  fields: string
}

interface CreateSchemaInput {
  dataEntity: string
  name: string
  schema: {
    properties: Record<string, unknown>
    required?: string[]
    'v-indexed'?: string[]
    'v-default-fields'?: string[]
    'v-security'?: {
      allowGetAll?: boolean
      publicRead?: string[]
      publicWrite?: string[]
      publicFilter?: string[]
    }
  }
}
