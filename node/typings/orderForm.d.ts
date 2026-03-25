interface Attachment {
  name: string
  content: Record<string, string>
}

interface OrderFormItem {
  index: nmber
  uniqueId: string
  itemId: string
  id: string
  quantity: number
  unitMultiplier: number
  measurementUnit: string
  seller: string
  refId: string
  productRefId: string
  productId: string
  name: string
  ean: string
  sellingPrice: number
  manualPrice?: number
  attachments: Attachment[]
  listPrice: string
  skuName: string
  modalType: unknown
  parentItemIndex: unknown
  parentAssemblyBinding: unknown
  assemblies: unknown[]
  priceValidUntil: string
  tax: number
  price: number
  manualPriceAppliedBy: unknown
  rewardValue: number
  isGift: boolean
  additionalInfo: {
    dimension: unknown
    brandName: string
    brandId: string
    offeringInfo: unknown
    offeringType: unknown
    offeringTypeId: unknown
  }
  preSaleDate: unknown
  productCategoryIds: string
  productCategories: Record<string, string>
  sellerChain: string[]
  imageUrl: string
  detailUrl: string
  components: unknown[]
  bundleItems: unknown[]
  attachmentOfferings: unknown[]
  offerings: unknown[]
  priceTags: PriceTag[]
  availability: string
  manufacturerCode: unknown
  priceDefinition: PriceDefinition
  taxCode: string
}

interface PriceDefinition {
  calculatedSellingPrice: number
  total: number
  sellingPrices: SellingPrice[]
  reason: unknown
}

interface SellingPrice {
  value: number
  quantity: number
}

interface PriceTag {
  name: string
  rate: number
  value: number
  rawValue: number
  jurisCode: string
  jurisType: string
  jurisName: string
  isPercentual: boolean
  identifier: unknown
  owner: unknown
}

interface OrderFormCustomApp {
  id: string
  major: number
  fields: {
    [key: string]: string
  }
}

interface OrderFormCustomData {
  customApps: OrderFormCustomApp[]
}

interface CheckoutAddress {
  addressId?: string
  addressType: string
  city: string | null
  complement: string | null
  country: string
  geoCoordinates?: number[]
  neighborhood: string | null
  number: string | null
  postalCode: string | null
  receiverName: string | null
  reference?: string | null
  state: string | null
  street: string | null
  isDisposable?: boolean
}

interface CheckoutProfile {
  userProfileId: string
  profileProvider: string
  availableAccounts: string[]
  availableAddresses: CheckoutAddress[]
  userProfile: {
    email: string
    firstName?: string
    lastName?: string
    phone?: string
    document?: string
    documentType?: string
    profilePicture?: string
    id?: string
    corporateName?: string
    tradeName?: string
    corporateDocument?: string
    stateInscription?: string
    corporatePhone?: string
    isCorporate?: boolean
  }
}

interface OpenTextField {
  value?: string
}

interface CheckoutClientPreferencesData {
  optinNewsLetter?: boolean
  locale?: string
}

interface OrderFormItemInput {
  id?: number
  index?: number
  quantity?: number
  seller?: string
  uniqueId?: string
  options?: AssemblyOptionInput[]
}

interface AssemblyOptionInput {
  id: string
  quantity: number
  assemblyId: string
  seller: string
  inputValues: Record<string, string>
  options?: AssemblyOptionInput[]
}

interface VtexUserProfile {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  document?: string
  documentType?: string
  profilePicture?: string
  id?: string
  corporateName?: string
  tradeName?: string
  corporateDocument?: string
  stateInscription?: string
  corporatePhone?: string
  isCorporate?: boolean
}

interface UserProfileInput {
  email?: string
  firstName?: string
  lastName?: string
  document?: string
  phone?: string
  documentType?: string
  isCorporate?: boolean
  corporateName?: string
  tradeName?: string
  corporateDocument?: string
  stateInscription?: string
}

interface PlaceOrderBody {
  referenceId: string
  savePersonalData?: boolean
  optinNewsLetter?: boolean
  value: number
  referenceValue: number
  interestValue: number
}

interface StorePreferencesData {
  countryCode: string
  currencyCode: string
  currencySymbol: string
  currencyFormatInfo: {
    currencyDecimalDigits: number
  }
}

interface Totalizer {
  id: string
  name: string
  value: number
}

interface OrderForm {
  orderFormId: string
  salesChannel: string
  items: OrderFormItem[]
  value: number
  customData: OrderFormCustomData
  storePreferencesData: StorePreferencesData
  userProfileId?: string
  clientProfileData: UserProfileInput
  totalizers: Totalizer[]
  shippingData: ShippingData
  userProfile: VtexUserProfile
}

type ProfileData = {
  id?: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  document?: string
  profilePicture?: string
}

type AddressData = {
  selectedAddresses: CheckoutAddress[]
}

interface ShippingData {
  address: CheckoutAddress | null
  // logisticsInfo: LogisticsInfo[]
  selectedAddresses: CheckoutAddress[]
  availableAddresses: CheckoutAddress[]
  pickupPoints: PickupPoint[]
}

interface PaymentInput {
  paymentSystem?: string
  bin?: string
  accountId?: string
  tokenId?: string
  installments?: number
  referenceValue?: number
  value?: number
}

interface PaymentDataInput {
  payments: PaymentInput[]
}

interface OrderFormConfiguration {
  paymentConfiguration: PaymentConfiguration
  taxConfiguration: TaxConfiguration | null
  minimumQuantityAccumulatedForItems: number
  decimalDigitsPrecision: number
  minimumValueAccumulated: number
  apps: App[]
  allowMultipleDeliveries: boolean
  allowManualPrice: boolean
  maxNumberOfWhiteLabelSellers: number
  maskFirstPurchaseData: boolean
  recaptchaValidation: boolean
}

interface PaymentConfiguration {
  requiresAuthenticationForPreAuthorizedPaymentOption: boolean
  allowInstallmentsMerge: boolean
  blockPaymentSession: boolean
  paymentSystemToCheckFirstInstallment: boolean
}

interface TaxConfiguration {
  allowExecutionAfterErrors: boolean
  authorizationHeader: string
  integratedAuthentication: boolean
  url: string | null
}

interface App {
  fields: string[]
  id: string
  major: number
}

interface InputOrderFormItem {
  id: string
  quantity: number
  seller: string
  // index: number
}

interface InputOrderFormItemWithAttachments extends InputOrderFormItem {
  attachments: Attachment[]
}
