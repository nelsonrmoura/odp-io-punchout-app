import { json } from 'co-body'
import { NotFoundError, UserInputError } from '@vtex/api'

import { getOrderFormIdFromCookie } from '../../utils/getOrderFromIdFromCookie'
import { cartParseVtexToWebMethods } from '../../parsers/transferCart/cartParseVtexToWebMethods'
import {
  PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
  PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
} from '../../utils/consts'
import { logToMasterData } from '../../utils/Logging'
import { sendDebugEvent } from '../../utils/debugWebhook'
// OdpSkuTranslateClient is now accessed via ctx.clients.odpSkuTranslate

export async function handleCors(ctx: Context, next: () => Promise<void>) {
  // Get the origin from the request
  const origin = ctx.get('Origin') || ctx.get('origin')

  // Set CORS headers for all requests
  // When using credentials, we cannot use wildcard for Access-Control-Allow-Origin
  ctx.set('Access-Control-Allow-Origin', origin || '*')
  ctx.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  ctx.set('Access-Control-Allow-Credentials', 'true')

  // Handle preflight OPTIONS request
  if (ctx.method === 'OPTIONS') {
    ctx.status = 200

    return
  }

  try {
    await next()
  } catch (error) {
    // Ensure CORS headers are set even on error responses
    ctx.set('Access-Control-Allow-Origin', origin || '*')
    ctx.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    )
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    ctx.set('Access-Control-Allow-Credentials', 'true')

    throw error
  }
}

export async function retrieveOrderformId(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    cookies,
    req,
    // clients: { session },
  } = ctx

  // const punchoutSession = await session.getSession(
  //   ctx.cookies.get('vtex_session') ?? '',
  //   ['punchout']
  // )

  // console.info('punchoutSession', punchoutSession)
  // logger.info(`punchoutSession : ${punchoutSession}`)
  // logToMasterData(ctx, 'retrieveOrderformId', '', 'info', punchoutSession)

  const body = await json(req)
  const orderFormId = body.orderFormId ?? getOrderFormIdFromCookie(cookies)

  if (!orderFormId) {
    // logger.error('Order form ID not found')
    logToMasterData(
      ctx,
      'retrieveOrderformId',
      orderFormId ?? '',
      'error',
      'Order form ID not found'
    )
    throw new UserInputError('Order form ID not found')
  }

  ctx.state.orderFormId = orderFormId
  ctx.status = 200

  await next()
}

export async function skuReferenceEncoder(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    clients: { masterdata, checkout, apps, odpSkuTranslate },
    state: { orderFormId },
  } = ctx

  const orderForm = await checkout.getOrderForm(orderFormId)
  const setupRequestId = (orderForm as OrderForm)?.customData?.customApps.find(
    (app: { id: string }) => app.id === 'punch-out'
  )?.fields.setupRequestId

  const setUpRequest = (
    await masterdata.searchDocuments<{
      content: PunchOutSetupRequest
      id: string
      status: string
    }>({
      dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
      schema: PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
      fields: ['setupId', 'content'],
      pagination: { page: 1, pageSize: 1 },
      where: `setupId='${setupRequestId}'`,
    })
  ).find((req) => !!req)

  if (!setUpRequest) {
    throw new UserInputError('Setup request not found!')
  }

  if (setUpRequest.status === 'used') {
    throw new UserInputError('Setup request has already been used!')
  }

  ctx.state.setupRequest = setUpRequest

  const contractId = setUpRequest.content.session.body.billing.id
  const contract = (
    await masterdata.searchDocuments<Contract>({
      dataEntity: 'CL',
      pagination: { page: 1, pageSize: 1 },
      fields: ['corporateDocument', 'accountAlias', 'userId', 'id'],
      where: `corporateDocument=${contractId}`,
    })
  ).find((ctr) => !!ctr)

  if (!contract) {
    throw new NotFoundError('Contract not found!')
  }

  ctx.state.contract = contract

  const itemList = (orderForm as OrderForm)?.items?.map((item) => item.id) ?? []

  const settings = await apps.getAppSettings(process.env.VTEX_APP_ID ?? '')
  const skuTranslateApiUrl = (settings as AppSettings).skuTranslateApiUrl

  if (!skuTranslateApiUrl) {
    // No SKU translate API configured — pass VTEX IDs as-is
    ctx.state.crossRefItemList = itemList.map((id) => ({
      vendorSkuId: id,
      skuId: id,
    }))

    return next()
  }

  const odpClient = odpSkuTranslate

  if (!itemList.length) {
    ctx.state.crossRefItemList = []

    return next()
  }

  try {
    const response = await odpClient.translateSkus(skuTranslateApiUrl, 'vtex-to-odp', itemList)

    let crossRefSku = response.mappings
      .filter((m) => m.found)
      .map((m) => ({ vendorSkuId: m.output, skuId: m.input }))

    // Items not found — pass through as-is
    const foundInputs = new Set(response.mappings.filter((m) => m.found).map((m) => m.input))
    const notFound = itemList
      .filter((id) => !foundInputs.has(id))
      .map((id) => ({ vendorSkuId: id, skuId: id }))

    crossRefSku = [...crossRefSku, ...notFound]

    // Remove duplicates
    const seen = new Set<string>()

    crossRefSku = crossRefSku.filter((item) => {
      const key = `${item.vendorSkuId}:${item.skuId}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)

      return true
    })

    ctx.state.crossRefItemList = crossRefSku
  } catch (error) {
    console.error('[skuReferenceEncoder] ODP SKU translate API error:', error)
    // Fallback: pass VTEX IDs as-is
    ctx.state.crossRefItemList = itemList.map((id) => ({
      vendorSkuId: id,
      skuId: id,
    }))
  }

  return next()
}

export async function convertOrderFormToWebMethods(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    state: { orderFormId, setupRequest },
    clients: { apps, webMethods, checkout },
  } = ctx

  if (!orderFormId) {
    // logger.error('Order form not found')
    logToMasterData(
      ctx,
      'convertOrderFormToWebMethods',
      orderFormId ?? '',
      'error',
      'Order form not found'
    )
    throw new UserInputError('Order form not found')
  }

  const orderForm = await checkout.getOrderForm(orderFormId)

  if (!orderForm) {
    // logger.error('Order form not found')
    logToMasterData(
      ctx,
      'convertOrderFormToWebMethods',
      orderFormId ?? '',
      'error',
      'Order form not found'
    )
    throw new UserInputError('Order form not found')
  }

  const settings = await apps.getAppSettings(process.env.VTEX_APP_ID ?? '')

  const transferCartRequest = await cartParseVtexToWebMethods(
    orderForm,
    setupRequest.content,
    ctx
  )

  await logToMasterData(
    ctx,
    'convertOrderFormToWebMethods-request',
    setupRequest.id,
    'debug',
    transferCartRequest
  )

  const punchbackUrl = setupRequest.content.session.header.url
  const isMockMode = !punchbackUrl.includes('odpbusiness.com')

  let responseForm: string

  if (isMockMode) {
    sendDebugEvent(
      ctx,
      {
        step: 'convertOrderFormToWebMethods',
        status: 'start',
        message: 'Mock mode detected — skipping WebMethods API call',
        timestamp: new Date().toISOString(),
      },
      setupRequest.content.session.header.buyerCookie
    )

    sendDebugEvent(
      ctx,
      {
        step: 'convertOrderFormToWebMethods',
        status: 'success',
        message: `Mock form generated with punchback URL: ${punchbackUrl}`,
        timestamp: new Date().toISOString(),
        details: {
          data: { punchbackUrl },
        },
      },
      setupRequest.content.session.header.buyerCookie
    )

    const cartDataBase64 = Buffer.from(
      JSON.stringify(transferCartRequest)
    ).toString('base64')

    const mockHtml = `<html>\n<body onload="document.forms[0].submit()">\n<form method="POST" action="${punchbackUrl}">\n<input type="hidden" name="cxml-base64" value="${cartDataBase64}" />\n</form>\n</body>\n</html>`

    responseForm = Buffer.from(mockHtml).toString('base64')
  } else {
    const tokenResponse = await webMethods.getToken(settings)

    const response = await webMethods.getTransformedOrderMessage(
      transferCartRequest,
      tokenResponse.TokenResponse.token
    )

    await logToMasterData(
      ctx,
      'convertOrderFormToWebMethods-response',
      setupRequest.id,
      'debug',
      response
    )

    responseForm = response
  }

  ctx.status = 200
  ctx.body = {
    form: responseForm,
  }

  await next()
}
