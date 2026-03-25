interface ItemIn {
  ItemID: {
    BuyerPartID: string
  }
}

interface ProfileData {
  email: string
  firstName: string
  lastName: string
  phone: string
  document: string
  profilePicture: string
  id?: string
}

interface AddressData {
  selectedAddresses: CheckoutAddress[]
}

interface PunchOutSetupRequest {
  session: SetupSession
}

interface PunchOutSetupResponse {
  session: SetupSessionResponse
}

interface SetupSessionResponse {
  buyerCookie: string
  startUrl: string
}

interface SetupSession {
  header: SetupHeader
  messageType: string
  operation: string
  body: SetupBody
  custom: SetupCustom
  mockWebmethods?: boolean
}

interface SetupCustom {
  security: SetupSecurity
}

interface SetupSecurity {
  views: SetupSecurityView[]
}

interface SetupSecurityView {
  name: string
  value: boolean
}

interface SetupHeader {
  sender: SetupSender
  punchOutType: string
  sessionData: string
  marketsiteUser: string
  url: string
  buyerCookie: string
}

interface SetupSender {
  sharedSecret: string
  username: string
}

interface SetupBody {
  data: SetupData
  shipping: SetupShipping
  billing: SetupBilling
  items: SetupItem[]
  selectedItem: SetupSelectedItem
  custom?: SetupCustom
}

interface SetupSelectedItem {
  refId: string
}

interface SetupData {
  uomType: string
  origIdentity: string
  catalogCode: string
}

interface SetupShipping {
  address: SetupAddress
  id: string
  name: string
  contact: SetupContact
}

interface SetupAddress {
  street: string
  complement: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface SetupContact {
  name: string
  email: string
  phone: string
}

interface SetupBilling {
  id: string
}

interface SetupItem {
  refId: string
  quantity: number
  bundleId: number
  configId: string
  comments: string
}

// interface SetupOrderInfo {
//   timeStamp: string
//   session: string
//   signature: string
//   documentid: string
//   type: string
//   PostedUserID: string
//   Header: SetupHeader
//   Security: {
//     View: SetupSecurityFlag[]
//     Flags: SetupSecurityFlagsInfo
//     UserProfile: SetupSecurityUserProfile
//   }
//   TransportInfo: SetupTransportInfo
//   OriginalDoc: string
//   // Assumed fields
//   Request: SetupRequest
// }

// interface SetupHeader {
//   msgType: string
//   msgCode: string
//   Username: string
//   Password: string
//   MarketsiteUser: string
//   BillToID: string
//   ReportLoc: string
//   FutureAdvDelivery: string
//   InvLoc: string
//   URL: string
//   Cookie: string
//   Session: string
//   PunchoutType: string
//   SessionData: string
//   PunchoutData: SetupPunchOutData
//   TradingNetworks: SetupTradingNetworkInfo
//   MessageHeader: SetupMessageHeader
// }

// interface SetupPunchOutData {
//   UOMType: string
//   OrigIdentity: string
//   CatalogCode: string
// }

// interface SetupTradingNetworkInfo {
//   ProcessRule: string
//   Service: string
//   PunchoutType: string
//   ProfileID: string
//   ProfileName: string
//   ProfileStatus: string
//   TNDocID: string
//   DupCheck: string
//   Flags: {
//     SuppShipHeadPayloadID: string
//   }
// }

interface SetupMessageHeader {
  ShipTo: SetupShipTo
  BillTo: SetupBillTo
}

interface SetupShipTo {
  type: string
  Addr: SetupAddr
}

interface SetupBillTo {
  Addr: {
    Name: string
  }
}

interface SetupAddr {
  id: string
  seq: string
  Name: string
  PostalAddress: SetupPostalAddress
  Contact: SetupContact
}

interface SetupPostalAddress {
  validate: string
  Address1: string
  Address2: string
  City: string
  State: string
  PostalCode: string
  Country: string
  Number: string
  Complement: string
}

// interface SetupContact {
//   id: string
//   Name: string
//   Email: {
//     _: string
//     type: string
//   }
//   PhoneNumber: {
//     Number: string
//   }
// }

interface SetupSecurityFlag {
  _: string
  name: string
}

interface SetupSecurityFlagsInfo {
  CostCtrFlg: string
  PONoFlg: string
  ReleaseFlg: string
  DeskTopFlg: string
  CRIFlg: string
  MinAdhereFlg: string
}

interface SetupSecurityUserProfile {
  username: string
  Flag: SetupSecurityFlag[]
}

interface SetupTransportInfo {
  requestURL: string
  localPort: string
  remoteIP: string
}

interface SetupRequest {
  OrderRequest: SetupOrderRequest
}

interface SetupOrderRequest {
  ItemIn: SetupItem[]
  ItemOut: SetupItem[]
}

interface SetupItem {
  ItemID: SetupItemId
}

interface SetupItemId {
  BuyerPartID: string
  SupplierPartID: string
}
