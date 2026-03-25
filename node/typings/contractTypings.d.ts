interface ListOrganizationUserResponse {
  users: OrganizationUser[]
}

interface ContractScope {
  id: string
  name: string
}

interface OrganizationUser {
  userId: string
  login: string
}

interface OrganizationUnit {
  createdAt: string
  updatedAt: string
  name: string
  path: {
    ids: string
    name: string
  }
  id: string
  customerGroup: {
    customerIds: string[]
  }
}

interface Contract {
  corporateDocument: string
  document: string
  homePhone: string
  stateRegistration: string
  email: string
  userId: string
  firstName: string
  lastName: string
  isNewsletterOptIn: boolean
  businessPhone: string
  corporateName: string
  documentType: string
  priceTables: string
  id: string
  accountId: string
  accountName: string
  dataEntityId: string
  createdBy: string
  createdIn: string
  lastInteractionBy: string
  lastInteractionIn: string
  accountAlias: string
}

interface Address {
  id: string
  addressLabel: string
  postalCode: string
  street: string
  number: string
  neighborhood: string
  complement: string
  city: string
  state: string
  country: string
  receiverName: string
  geoCoordinate: string
  addressType: string
  userId: string
}
