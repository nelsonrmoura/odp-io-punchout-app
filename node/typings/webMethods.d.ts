interface TokenRequest {
  TokenRequest: {
    userId: string
  }
}

interface TokenResponse {
  TokenResponse: {
    code: string
    token: string
    tokenExpirationTime: string
    status: string
    message: string
  }
}

interface TransferCartRequest {
  shoppingCartRequest: {
    timestamp: string
    header: {
      msgType: string
      siteName: string
      userName: string
      password: string
      marketplace: string
      accountNumber: string
      inventoryLoc: string
      punchoutURL: string
      buyerCookie: string
      userAgent: string
      sessionData: string
      shipTo: {
        addressID: string
        name: string
        address: {
          address1: string
          address2: string
          city: string
          state: string
          postalCode: string
          country: string
        }
        contact: {
          name: string
          email: string
          phoneNumber: string
        }
      }
      billTo: {
        addressID: string
        name: string
        address: {
          address1: string
          city: string
          state: string
          postalCode: string
          country: string
        }
      }
      accountFields: {
        costcenter: {
          costcenterName: string
          costcenterValue: string
        }
        ponumber: {
          ponumberName: string
          ponumberValue: string
        }
      }
    }
    detail: {
      totals: {
        subTotal: string
        tax: {
          rate: string
          value: string
        }
        fees: Array<{
          name: string
          description: string
          value: string
        }>
        delivery: string
        total: string
      }
      item: TransferCartItem[]
    }
  }
}

interface TransferCartItem {
  quantity: string
  sku: string
  customerSku: string
  uom: string
  description: string
  costcenter: string
  release: string
  classification: {
    domain: string
    value: string
  }
  manufacturerName: string
  manufacturerPartNumber: string
  configurationID: string
  bundleID: string
  configurationLink: string
  sellPrice: string
  listPrice: string
  extendedPrice: string
  tax: {
    rate: string
    value: string
  }
  fees: Array<{
    name: string
    description: string
    value: string
  }>
  comments: string
  flags: Array<{
    name: string
    description: string
    value: string
  }>
}

interface TransferCartResponse {
  shoppingCartResponse: {
    header: {
      status: string
    }
    shoppingCart: string
  }
}
