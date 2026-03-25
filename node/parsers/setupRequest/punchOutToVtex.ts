import { UserInputError } from '@vtex/api'

import { getUsernameFromSetupRequest } from '../../modules/setupRequest'
import { logToMasterData } from '../../utils/Logging'
import { sendDebugEvent } from '../../utils/debugWebhook'

export const addressesMatch = (
  address1: CheckoutAddress,
  address2: CheckoutAddress
) => {
  if (
    address1.receiverName === address2.receiverName &&
    address1.postalCode === address2.postalCode &&
    address1.city === address2.city &&
    address1.state === address2.state &&
    address1.country === address2.country &&
    address1.street === address2.street
  ) {
    return true
  }

  return false
}

// Common 2-letter to 3-letter ISO country code mapping
const COUNTRY_CODE_MAP: Record<string, string> = {
  US: 'USA', CA: 'CAN', MX: 'MEX', GB: 'GBR', UK: 'GBR',
  DE: 'DEU', FR: 'FRA', IT: 'ITA', ES: 'ESP', BR: 'BRA',
  AU: 'AUS', JP: 'JPN', CN: 'CHN', IN: 'IND', KR: 'KOR',
}

const normalizeCountryCode = (code: string | undefined): string => {
  if (!code) return ''
  const upper = code.toUpperCase().trim()

  // Already 3-letter
  if (upper.length === 3) return upper

  // Map 2-letter to 3-letter
  return COUNTRY_CODE_MAP[upper] ?? upper
}

export const punchOutAddressToVtex = (
  shipToAddress: SetupPostalAddress,
  shipToAddressContact: SetupContact
) => ({
  addressType: 'residential',
  receiverName: shipToAddressContact?.name ?? '',
  postalCode: shipToAddress?.PostalCode?.replace(/-/g, '') ?? '',
  city: shipToAddress?.City,
  state: shipToAddress?.State,
  country: normalizeCountryCode(shipToAddress?.Country),
  street: shipToAddress?.Address1,
  number: shipToAddress?.Number ?? '',
  complement: shipToAddress?.Complement ?? null,
  neighborhood: shipToAddress?.Address2 ?? '',
})

const getProductRedirectUrl = async (
  productId: string,
  _search: Context['clients']['search'],
  ctx: Context
): Promise<string> => {
  const sessionId =
    ctx.state.setupRequest?.content?.session?.header?.buyerCookie ?? 'unknown'

  const startTime = Date.now()

  sendDebugEvent(
    ctx,
    {
      step: 'getProductRedirectUrl',
      status: 'start',
      message: `Catalog API lookup for product ID: ${productId}`,
      timestamp: new Date().toISOString(),
      details: { data: { productId, account: ctx.vtex.account } },
    },
    sessionId
  )

  try {
    const product = await ctx.clients.catalog.getProduct(productId)

    const elapsed = Date.now() - startTime

    if (product?.LinkId) {
      const url = `/${product.LinkId.toLowerCase()}-${productId}/p`

      sendDebugEvent(
        ctx,
        {
          step: 'getProductRedirectUrl',
          status: 'success',
          message: `PDP URL built in ${elapsed}ms: ${url}`,
          timestamp: new Date().toISOString(),
          details: {
            data: {
              url,
              linkId: product.LinkId,
              productName: product.Name,
              productId: product.Id,
              skuId: productId,
              responseTimeMs: elapsed,
            },
          },
        },
        sessionId
      )

      return url
    }

    sendDebugEvent(
      ctx,
      {
        step: 'getProductRedirectUrl',
        status: 'error',
        message: `Catalog API returned no LinkId (${elapsed}ms)`,
        timestamp: new Date().toISOString(),
        details: { data: { productId, product, responseTimeMs: elapsed } },
      },
      sessionId
    )
  } catch (error) {
    const elapsed = Date.now() - startTime

    logToMasterData(ctx, 'getProductRedirectUrl-error', '', 'error', error)
    sendDebugEvent(
      ctx,
      {
        step: 'getProductRedirectUrl',
        status: 'error',
        message: `Catalog API failed (${elapsed}ms): ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        details: { data: { productId, error: error instanceof Error ? error.message : String(error), responseTimeMs: elapsed } },
      },
      sessionId
    )
  }

  return '/'
}

const getProfileData = async (
  user: State['user'],
  odpProfileUserName: string | null,
  ctx: Context
): Promise<ProfileData> => {
  const userData = await ctx.clients.masterdata.searchDocuments<ProfileData>({
    dataEntity: 'CL',
    schema: 'mdv1',
    fields: [
      'id',
      'email',
      'firstName',
      'lastName',
      'phone',
      'document',
      'profilePicture',
    ],
    pagination: { page: 1, pageSize: 100 },
    where: `email='${user.email}'`,
  })

  const defaultProfile = {
    email: odpProfileUserName ?? '',
    firstName: '',
    lastName: '',
    phone: '',
    document: '',
    profilePicture: '',
  }

  const foundUser = userData.find((item) => item.email === user.email)

  return foundUser ?? defaultProfile
}

/**
 * Extract profile data and redirect URL from the setup request.
 * Called BEFORE applying profile to OrderForm.
 */
export const parseProfileAndRedirect = async ({
  content,
  user,
  ctx,
}: {
  content: PunchOutSetupRequest
  user: State['user']
  ctx: Context
}) => {
  const {
    clients: { search },
    state: { operation },
  } = ctx

  const { session: inputCart } = content

  // Use redirectUrl from body.data if provided by the procurement system
  // Otherwise fall back to default logic (/ for Level 1, PDP for Level 2)
  const customRedirectUrl = (inputCart?.body?.data as unknown as Record<string, unknown>)?.redirectUrl as string | undefined

  let redirectUrl = customRedirectUrl || '/'

  if (!customRedirectUrl && inputCart?.body.selectedItem?.refId && inputCart.body.selectedItem.refId !== 'null') {
    redirectUrl = await getProductRedirectUrl(
      ctx.state.crossRefItemList.find(
        (cri) => cri.vendorSkuId === inputCart.body.selectedItem.refId
      )?.skuId ?? inputCart.body.selectedItem.refId,
      search,
      ctx
    )
  }

  if (operation === 'edit') {
    redirectUrl = '/checkout/cart'
  }

  if (operation === 'inspect') {
    redirectUrl = '/checkout/cart'
  }

  const odpProfileUserName = getUsernameFromSetupRequest(content)
  const profileData = await getProfileData(user, odpProfileUserName, ctx)

  return { profileData, redirectUrl }
}

/**
 * Build address data from the setup request, checking against the OrderForm's
 * availableAddresses for an existing match.
 *
 * IMPORTANT: Call this AFTER applying profile to the OrderForm and re-fetching it,
 * so availableAddresses is populated with the user's existing addresses.
 */
export const buildAddressData = ({
  content,
  orderForm,
}: {
  content: PunchOutSetupRequest
  orderForm: OrderForm
}): AddressData | undefined => {
  const { body } = content.session
  const shipToAddress = body.shipping?.address
  const shipToAddressContact = body.shipping?.contact

  if (!shipToAddress) {
    return undefined
  }

  const postalAddress: SetupPostalAddress = {
    validate: '',
    Address1: shipToAddress.street,
    Address2: '',
    City: shipToAddress.city,
    State: shipToAddress.state,
    PostalCode: shipToAddress.postalCode,
    Country: shipToAddress.country,
    Number: '',
    Complement: shipToAddress.complement,
  }

  const newAddress = punchOutAddressToVtex(postalAddress, shipToAddressContact)

  // Check if this address already exists in the OrderForm (populated after profile was applied)
  const existingMatchingAddress = (
    orderForm.shippingData?.availableAddresses ?? []
  ).find((addr) => addressesMatch(addr, newAddress))

  if (existingMatchingAddress) {
    // Use existing address — it already has an addressId from VTEX
    return {
      selectedAddresses: [existingMatchingAddress],
    }
  }

  // New address — omit addressId, VTEX Checkout will generate one
  return {
    selectedAddresses: [newAddress],
  }
}

/**
 * @deprecated Use parseProfileAndRedirect + buildAddressData instead.
 * Kept for backward compatibility during transition.
 */
export const parsePunchOutSetupRequestToVtex = async ({
  content,
  user,
  orderForm,
  ctx,
}: {
  content: PunchOutSetupRequest
  user: State['user']
  orderForm: OrderForm | void
  ctx: Context
}) => {
  if (!orderForm) {
    throw new UserInputError('Order form not found!')
  }

  const { profileData, redirectUrl } = await parseProfileAndRedirect({
    content,
    user,
    ctx,
  })

  const addressData = buildAddressData({ content, orderForm })

  return { profileData, addressData, redirectUrl }
}
