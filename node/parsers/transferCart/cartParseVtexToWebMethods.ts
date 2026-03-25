import { UserInputError } from '@vtex/api'

const parseOrderFormItem = async (
  orderFormItem: OrderFormItem,
  ctx: Context
): Promise<TransferCartItem> => {
  // TODO: Check if this is the correct way to get the custom sku
  const vendorSku =
    ctx.state.crossRefItemList.find((cri) => cri.skuId === orderFormItem.id)
      ?.vendorSkuId ?? orderFormItem.id

  return {
    quantity: orderFormItem.quantity.toString(),
    sku: vendorSku,
    customerSku: orderFormItem.refId, // TODO: Update this with the vtex mapping once it's done
    // Is a specification
    uom: orderFormItem.measurementUnit,
    description: orderFormItem.name,
    costcenter: '',
    release: '',
    classification: {
      domain: 'UNSPSC',
      // Can be a specification
      value: '44120000',
    },
    manufacturerName: '',
    manufacturerPartNumber: '',
    // From VTEX, probably custom fields in OF
    configurationID: '',
    bundleID: '',
    // From VTEX, probably custom fields in OF
    configurationLink: '',
    sellPrice: orderFormItem.sellingPrice.toString(),
    listPrice: orderFormItem.listPrice.toString(),
    extendedPrice: orderFormItem.price.toString(),
    tax: {
      rate: '',
      value: orderFormItem.tax.toString(),
    },
    fees: [
      // {
      //   name: '',
      //   description: '',
      //   value: '',
      // },
    ],
    // From POSR
    comments: 'Ink for office',
    // Check if these need to be sent
    flags: [
      // {
      //   name: 'ContractItem',
      //   description: '',
      //   value: 'false',
      // },
      // {
      //   name: 'HazardousItem',
      //   description: '',
      //   value: 'true',
      // },
    ],
  }
}

export async function cartParseVtexToWebMethods(
  orderForm: OrderForm,
  setupRequest: PunchOutSetupRequest,
  ctx: Context
): Promise<TransferCartRequest> {
  const sessionData = {
    sessionData: {
      ...setupRequest.session.body.data,
      origIdentity: setupRequest.session.header.sender.username,
    },
  }

  const {
    clients: { masterdata: mdClient },
  } = ctx

  const contractAddresses = await mdClient.searchDocuments<Address>({
    dataEntity: 'AD',
    pagination: { page: 1, pageSize: 100 },
    where: `(userId=${ctx.state.contract.id})`,
    fields: ['_all'],
    sort: 'updatedIn DESC',
  })

  let address: Address | undefined = contractAddresses.find(
    (ad) => ad.addressType === 'invoice'
  )

  if (!address) {
    address = contractAddresses.find((ad) => !!ad)
  }

  if (!address) {
    throw new UserInputError('No address found for contract!')
  }

  return {
    shoppingCartRequest: {
      timestamp: new Date().toISOString(),
      header: {
        msgType: setupRequest.session.messageType,
        siteName: 'ODPBS',
        userName: setupRequest.session.header.sender.username,
        password: '',
        marketplace: '',
        accountNumber: setupRequest.session.body.billing.id,
        inventoryLoc: '',
        punchoutURL: setupRequest.session.header.url,
        buyerCookie: setupRequest.session.header.buyerCookie,
        userAgent: '',
        sessionData: Buffer.from(JSON.stringify(sessionData)).toString(
          'base64'
        ),
        // TODO: Change to read from the order form and the session
        shipTo: {
          // TODO: Should we get the name and ID from VTEX order form, in that case, should the address
          // ID match the ID from WM. Or should we get them from the B2B APIs?
          addressID: setupRequest.session.body.shipping.id ?? '',
          name: setupRequest.session.body.shipping.name ?? '',
          address: {
            address1: orderForm.shippingData.address?.street ?? '',
            address2: orderForm.shippingData.address?.complement ?? '',
            city: orderForm.shippingData.address?.city ?? '',
            state: orderForm.shippingData.address?.state ?? '',
            postalCode: orderForm.shippingData.address?.postalCode ?? '',
            country: orderForm.shippingData.address?.country ?? '',
          },
          contact: {
            name: setupRequest.session.body.shipping.contact.name,
            email: setupRequest.session.body.shipping.contact.email,
            phoneNumber: setupRequest.session.body.shipping.contact.phone,
          },
        },
        // These may be in the order form
        billTo: {
          addressID: setupRequest.session.body.billing.id,
          name: setupRequest.session.body.billing.id,
          address: {
            address1: [address.number, address.street]
              .filter((part) => !!part && part.length > 0)
              .join(', '),
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
        },
        // These will be in the order form
        accountFields: {
          costcenter: {
            costcenterName: 'cc',
            costcenterValue: 'cc1',
          },
          ponumber: {
            ponumberName: 'department',
            ponumberValue: 'po1',
          },
        },
      },
      detail: {
        totals: {
          subTotal:
            orderForm.totalizers
              .find((totalizer) => totalizer.id === 'Items')
              ?.value.toString() ?? '0',
          tax: {
            rate: '',
            value:
              orderForm.totalizers
                .filter((totalizer) => totalizer.id === 'CustomTax')
                .reduce((acc: number, totalizer) => acc + totalizer.value, 0)
                .toString() ?? '0',
          },
          fees: [
            // {
            //   name: 'hazmat fee', // make it zero
            //   description: 'hazardous material fee',
            //   value: '0.00',
            // },
          ],
          delivery:
            orderForm.totalizers
              .find((totalizer) => totalizer.id === 'Shipping')
              ?.value.toString() ?? '0',
          total: orderForm.value.toString(),
        },
        item: await Promise.all(
          orderForm.items.map((item) => parseOrderFormItem(item, ctx))
        ),
      },
    },
  }
}
