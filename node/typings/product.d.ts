interface Product {
  Id: number
  Name: string
  DepartmentId: number
  CategoryId: number
  BrandId: number
  LinkId: string
  RefId: string
  IsVisible: boolean
  Description: string
  DescriptionShort: string
  ReleaseDate: string
  KeyWords: string | null
  Title: string
  IsActive: boolean
  TaxCode: string | null
  MetaTagDescription: string
  SupplierId: string | null
  ShowWithoutStock: boolean
  ListStoreId: number[]
  AdWordsRemarketingCode: string | null
  LomadeeCampaignCode: string | null
}
