import { NotFoundError, ResolverError, UserInputError } from '@vtex/api'

import {
  PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
  PUNCHOUT_SETUP_REQUEST_FIELDS,
  PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
} from '../../utils/consts'
import { parseProfileAndRedirect, buildAddressData } from '../../parsers/setupRequest/punchOutToVtex'
import {
  addItemsToCart,
  updateOrderFormWithAddress,
  updateOrderFormWithProfile,
} from '../../modules/orderForm'
import { logToMasterData } from '../../utils/Logging'
import { forwardCheckoutCookies, forwardSessionCookies } from '../../utils'
import { sendDebugEvent } from '../../utils/debugWebhook'
// import { getOrderFormIdFromCookie } from '../../utils/getOrderFromIdFromCookie'

export async function retrieveSetupHandler(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    clients: { masterdata },
    state,
    query: { setupId },
  } = ctx

  let setupIdValue

  try {
    setupIdValue = Array.isArray(setupId) ? setupId[0] : setupId

    if (!setupIdValue) {
      // logger.error('[retriveSessionDetails] Setup Id not found')
      logToMasterData(
        ctx,
        'retrieveSetupHandler-setupIdError',
        '',
        'error',
        'Setup Id not found'
      )
      throw new UserInputError('[retriveSessionDetails] Setup Id not found')
    }

    const setupRequest = (
      await masterdata.searchDocuments<PunchOutSetUpRequestDoc>({
        dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
        schema: PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
        fields: PUNCHOUT_SETUP_REQUEST_FIELDS,
        pagination: {
          page: 1,
          pageSize: 100,
        },
        where: `setupId='${encodeURIComponent(setupIdValue)}'`,
      })
    ).find((item) => item)

    if (!setupRequest) {
      // logger.error('[retriveSessionDetails] Setup details not found')
      logToMasterData(
        ctx,
        'retrieveSetupHandler-setupIdError',
        setupIdValue,
        'error',
        'Setup details not found'
      )
      throw new NotFoundError('[retriveSessionDetails] Setup details not found')
    }

    /* logger.info(
      '[retriveSessionDetails] SessionDetails retrieved and stored in context'
    ) */
    logToMasterData(
      ctx,
      'retrieveSetupHandler-sessionDetails',
      setupRequest.setupId,
      'info',
      setupRequest
    )

    if (setupRequest.status === 'used') {
      // logger.error('[retriveSessionDetails] Session already used')
      logToMasterData(
        ctx,
        'retrieveSetupHandler-sessionUsed',
        setupRequest.setupId,
        'info',
        setupRequest
      )
      throw new UserInputError('[retriveSessionDetails] Session already used')
    }

    state.setupRequest = {
      id: setupRequest.setupId,
      content: setupRequest.content,
      status: setupRequest.status,
    }

    state.operation = setupRequest?.content.session.operation

    const itemsList = (setupRequest?.content.session?.body?.items ?? []).map(
      (it) => it.refId
    )

    if (setupRequest?.content.session?.body?.selectedItem?.refId && setupRequest.content.session.body.selectedItem.refId !== 'null') {
      itemsList.push(setupRequest.content.session.body.selectedItem.refId)
    }

    state.itemList = itemsList

    // TODO: Check if we can retrieve the contract information below using the authenticated user's session.
    const contractId = setupRequest?.content?.session?.body?.billing?.id

    if (!contractId) {
      throw new UserInputError('[retrieveSetupHandler] Invalid contractId')
    }

    const contractList = await masterdata.searchDocuments<Contract>({
      dataEntity: 'CL',
      schema: 'mdv1',
      fields: [
        'id',
        'name',
        'email',
        'corporateDocument',
        'phone',
        'firstName',
        'lastName',
        'accountAlias',
      ],
      pagination: {
        page: 1,
        pageSize: 100,
      },
      where: `corporateDocument='${encodeURIComponent(contractId)}'`,
    })

    if (!contractList) {
      throw new UserInputError(
        `[retrieveSetupHandler] Invalid contractId for ${contractId}`
      )
    }

    if (contractList.length > 1) {
      throw new UserInputError(
        `[retrieveSetupHandler] Multiple contracts found contact support for ${contractId}`
      )
    }

    const contract = contractList.find((item) => item)

    ctx.state.xRef = contract?.accountAlias ?? ''

    // logger.info('[retriveSessionDetails] Done retrieving session details')
    logToMasterData(
      ctx,
      'retrieveSetupHandler-success',
      setupRequest.setupId,
      'info',
      state.setupRequest
    )
    await next()
  } catch (error) {
    // logger.error(`[retriveSessionDetails] error : ${error.message}`)
    logToMasterData(
      ctx,
      'retrieveSetupHandler-error',
      setupIdValue ?? '',
      'error',
      error
    )
    throw new ResolverError(error)
  }
}

export async function patchSession(ctx: Context, next: () => Promise<void>) {
  const {
    clients: { extendedSession: sessionClient },
  } = ctx

  const responseRaw = await sessionClient.updateSession()

  await forwardSessionCookies(responseRaw.headers, ctx, [
    'vtex_session',
    'vtex_segment',
  ])
  await next()
}

export async function skuReferenceDecoder(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    clients: { apps, odpSkuTranslate },
    state: { itemList },
  } = ctx

  const sessionId =
    ctx.state.setupRequest?.content?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'skuReferenceDecoder',
      status: 'start',
      message: `Starting SKU decode — ${itemList.length} items`,
      timestamp: new Date().toISOString(),
      details: { data: { itemList } },
    },
    sessionId
  )

  const settings = await apps.getAppSettings(process.env.VTEX_APP_ID ?? '')
  const skuTranslateApiUrl = (settings as AppSettings).skuTranslateApiUrl

  if (!skuTranslateApiUrl) {
    sendDebugEvent(
      ctx,
      {
        step: 'skuReferenceDecoder',
        status: 'start',
        message: 'No skuTranslateApiUrl configured — passing IDs as-is',
        timestamp: new Date().toISOString(),
      },
      sessionId
    )

    ctx.state.crossRefItemList = itemList
      .filter((id: string) => id && id !== 'null')
      .map((id: string) => ({ vendorSkuId: id, skuId: id }))

    return next()
  }

  const odpClient = odpSkuTranslate

  const validItems = itemList.filter((id: string) => id && id !== 'null')

  if (!validItems.length) {
    sendDebugEvent(
      ctx,
      {
        step: 'skuReferenceDecoder',
        status: 'success',
        message: 'No valid items to decode — skipping API call',
        timestamp: new Date().toISOString(),
      },
      sessionId
    )

    ctx.state.crossRefItemList = []

    return next()
  }

  try {
    sendDebugEvent(
      ctx,
      {
        step: 'skuReferenceDecoder',
        status: 'start',
        message: `Calling ODP SKU translate API: ${skuTranslateApiUrl}`,
        timestamp: new Date().toISOString(),
        details: { data: { direction: 'odp-to-vtex', skuIds: validItems } },
      },
      sessionId
    )

    const response = await odpClient.translateSkus(skuTranslateApiUrl, 'odp-to-vtex', validItems)

    sendDebugEvent(
      ctx,
      {
        step: 'skuReferenceDecoder',
        status: 'success',
        message: `API returned ${response.mappings.length} mappings (${response.mappings.filter((m) => m.found).length} found)`,
        timestamp: new Date().toISOString(),
        details: { data: { mappings: response.mappings } },
      },
      sessionId
    )

    let crossRefItems = response.mappings
      .filter((m) => m.found)
      .map((m) => ({ vendorSkuId: m.input, skuId: m.output }))

    // Items not found in API — pass through as-is (fallback)
    const foundInputs = new Set(response.mappings.filter((m) => m.found).map((m) => m.input))
    const notFound = validItems
      .filter((id: string) => !foundInputs.has(id))
      .map((id: string) => ({ vendorSkuId: id, skuId: id }))

    crossRefItems = [...crossRefItems, ...notFound]

    // Remove duplicates
    const seen = new Set<string>()

    crossRefItems = crossRefItems.filter((item) => {
      const key = `${item.vendorSkuId}:${item.skuId}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)

      return true
    })

    ctx.state.crossRefItemList = crossRefItems
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)

    sendDebugEvent(
      ctx,
      {
        step: 'skuReferenceDecoder',
        status: 'error',
        message: `ODP SKU translate API error: ${errMsg}`,
        timestamp: new Date().toISOString(),
        details: { data: { error: errMsg, skuIds: validItems } },
      },
      sessionId
    )

    // Fallback: pass ODP IDs through as-is
    ctx.state.crossRefItemList = validItems.map((id: string) => ({
      vendorSkuId: id,
      skuId: id,
    }))
  }

  return next()
}

export async function cartHandler(
  ctx: Context,
  next: () => Promise<OrderForm>
) {
  const {
    // cookies,
    clients: { checkout },
    state: {
      setupRequest: { content, id },
      user,
      operation,
    },
  } = ctx

  const sessionId =
    ctx.state.setupRequest?.content?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'cartHandler',
      status: 'start',
      message: 'Starting cart handler — creating order form',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          setupId: id,
          operation,
          userEmail: user?.email,
        },
      },
    },
    sessionId
  )

  try {
    // const previousOrderFormId =
    //   content?.session?.body?.data?.previousOrderFormId

    let orderForm = await checkout.newOrderForm()

    if (!orderForm) {
      throw new ResolverError('Failed to create order form')
    }

    sendDebugEvent(
      ctx,
      {
        step: 'cartHandler.newOrderForm',
        status: 'success',
        message: 'New order form created',
        timestamp: new Date().toISOString(),
        details: { data: { orderFormId: orderForm.orderFormId } },
      },
      sessionId
    )

    // Step 1: Parse profile data and redirect URL (no OrderForm dependency)
    const { profileData, redirectUrl } = await parseProfileAndRedirect({
      content,
      user,
      ctx,
    })

    // Step 2: Apply profile FIRST — this may populate availableAddresses on the OrderForm
    try {
      orderForm = await updateOrderFormWithProfile({
        checkout,
        orderForm,
        profileData,
        ctx,
      })

      sendDebugEvent(
        ctx,
        {
          step: 'cartHandler.updateProfile',
          status: 'success',
          message: 'Profile applied to order form',
          timestamp: new Date().toISOString(),
          details: {
            data: {
              orderFormId: orderForm.orderFormId,
              email: profileData?.email,
            },
          },
        },
        sessionId
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to apply profile to OrderForm'

      logToMasterData(ctx, 'cartHandler-profileUpdate-error', id ?? '', 'error', message)
      sendDebugEvent(
        ctx,
        {
          step: 'cartHandler.updateProfile',
          status: 'error',
          message,
          timestamp: new Date().toISOString(),
          details: { data: { setupId: id } },
        },
        sessionId
      )
      // Continue — user can fill profile manually
    }

    // Step 3: Re-fetch OrderForm to get populated availableAddresses after profile was applied
    try {
      const refreshedOrderForm = await checkout.getOrderForm(orderForm.orderFormId)

      if (refreshedOrderForm) {
        orderForm = refreshedOrderForm
        sendDebugEvent(
          ctx,
          {
            step: 'cartHandler.refetchOrderForm',
            status: 'success',
            message: 'Order form re-fetched after profile update',
            timestamp: new Date().toISOString(),
            details: {
              data: {
                orderFormId: orderForm.orderFormId,
                availableAddressCount:
                  (orderForm as OrderForm & { availableAddresses?: unknown[] })
                    .availableAddresses?.length ?? 0,
              },
            },
          },
          sessionId
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to re-fetch OrderForm'

      logToMasterData(ctx, 'cartHandler-refetchOrderForm-error', id ?? '', 'error', message)
      sendDebugEvent(
        ctx,
        {
          step: 'cartHandler.refetchOrderForm',
          status: 'error',
          message,
          timestamp: new Date().toISOString(),
          details: { data: { setupId: id } },
        },
        sessionId
      )
      // Continue with the existing orderForm — address match may not work but we can still try
    }

    // Step 4: Build address data using the refreshed OrderForm (with availableAddresses)
    const addressData = buildAddressData({ content, orderForm })

    // Step 5: Apply address to OrderForm
    try {
      orderForm = await updateOrderFormWithAddress({
        checkout,
        orderForm,
        addressData,
        ctx,
      })

      sendDebugEvent(
        ctx,
        {
          step: 'cartHandler.updateAddress',
          status: 'success',
          message: 'Address applied to order form',
          timestamp: new Date().toISOString(),
          details: {
            data: {
              orderFormId: orderForm.orderFormId,
              hasAddressData: !!addressData,
            },
          },
        },
        sessionId
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to apply address to OrderForm'

      logToMasterData(ctx, 'cartHandler-addressUpdate-error', id ?? '', 'error', message)
      sendDebugEvent(
        ctx,
        {
          step: 'cartHandler.updateAddress',
          status: 'error',
          message,
          timestamp: new Date().toISOString(),
          details: { data: { setupId: id } },
        },
        sessionId
      )
      // Continue — user can fill address manually
    }

    if (['edit', 'inspect'].includes(operation)) {
      orderForm = await addItemsToCart({
        checkout,
        orderFormId: orderForm.orderFormId,
        items: content.session.body.items,
        ctx,
      })

      sendDebugEvent(
        ctx,
        {
          step: 'cartHandler.addItems',
          status: 'success',
          message: 'Items added to cart',
          timestamp: new Date().toISOString(),
          details: {
            data: {
              orderFormId: orderForm.orderFormId,
              itemCount: content.session.body.items?.length ?? 0,
            },
          },
        },
        sessionId
      )
    }

    try {
      // let customDataObject: {
      //   setupRequestId: string
      //   orderFormIds?: string
      // } = {
      //   setupRequestId: id,
      // }

      // if (previousOrderFormId && previousOrderFormId !== '') {
      //   customDataObject = {
      //     ...customDataObject,
      //     orderFormIds: previousOrderFormId,
      //   }
      // }

      await checkout.updateSingleFieldCustomData({
        orderFormId: orderForm.orderFormId,
        appId: 'punch-out',
        appFieldName: 'setupRequestId',
        value: id,
      })
      // if (previousOrderFormId && previousOrderFormId !== '') {
      //   await checkout.updateSingleFieldCustomData({
      //     orderFormId: orderForm.orderFormId,
      //     appId: 'punch-out',
      //     appFieldName: 'orderFormIds',
      //     value: previousOrderFormId,
      //   })
      // }
    } catch (error) {
      // logger.error(`[cartHandler] error : ${error.message}`)
      logToMasterData(
        ctx,
        'cartHandler-error',
        orderForm.orderFormId ?? '',
        'error',
        error
      )
      throw new ResolverError(error)
    }

    ctx.state.redirectUrl = redirectUrl
    ctx.state.orderFormId = orderForm.orderFormId

    sendDebugEvent(
      ctx,
      {
        step: 'cartHandler',
        status: 'success',
        message: 'Cart handler completed — redirecting user',
        timestamp: new Date().toISOString(),
        details: {
          data: {
            setupId: id,
            orderFormId: orderForm.orderFormId,
            redirectUrl,
          },
        },
      },
      sessionId
    )

    await next()
  } catch (error) {
    // logger.error(
    //   `[createEmptyCartHandler] error: ${
    //     error instanceof Error ? error.message : 'Unknown error'
    //   }`
    // )
    logToMasterData(
      ctx,
      'cartHandler-error',
      id ?? '',
      'error',
      error instanceof Error ? error.message : 'Unknown error'
    )
    sendDebugEvent(
      ctx,
      {
        step: 'cartHandler',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        details: { data: { setupId: id } },
      },
      sessionId
    )
    throw new ResolverError(
      error instanceof Error ? error : new Error('Unknown error')
    )
  }
}

/**
 * For edit/inspect flows: patch the VTEX session with checkout.orderFormId
 * so the session transform fires immediately (before the user reaches the storefront).
 * This makes punchout.operation, punchOutFlags, etc. available on any page.
 *
 * Only runs for edit/inspect — create flows don't need it because the user
 * lands on homepage/PDP where session data isn't consumed yet.
 */
export async function patchSessionWithOrderForm(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    clients: { extendedSession: sessionClient },
    state: { operation, orderFormId },
  } = ctx

  const sessionId =
    ctx.state.setupRequest?.content?.session?.header?.buyerCookie ?? 'unknown'

  if (!['edit', 'inspect'].includes(operation)) {
    await next()

    return
  }

  if (!orderFormId) {
    sendDebugEvent(
      ctx,
      {
        step: 'patchSessionWithOrderForm',
        status: 'success',
        message: 'Skipped — no orderFormId available',
        timestamp: new Date().toISOString(),
      },
      sessionId
    )
    await next()

    return
  }

  try {
    // Read the vtex_session cookie that was set during patchSession (earlier in the chain)
    const sessionCookie = ctx.state.sessionToken
      ? `vtex_session=${ctx.state.sessionToken}`
      : ''

    const response = await sessionClient.patchSessionWithOrderFormId(
      orderFormId,
      sessionCookie
    )

    // Forward any updated session cookies from the response
    await forwardSessionCookies(response.headers, ctx, [
      'vtex_session',
      'vtex_segment',
    ])

    sendDebugEvent(
      ctx,
      {
        step: 'patchSessionWithOrderForm',
        status: 'success',
        message: `Session patched with orderFormId — transform should fire for ${operation} mode`,
        timestamp: new Date().toISOString(),
        details: {
          data: {
            orderFormId,
            operation,
          },
        },
      },
      sessionId
    )
  } catch (error) {
    // Non-blocking — the session transform can still fire later when checkout loads
    const errMsg = error instanceof Error ? error.message : String(error)

    sendDebugEvent(
      ctx,
      {
        step: 'patchSessionWithOrderForm',
        status: 'error',
        message: `Failed to patch session with orderFormId: ${errMsg}`,
        timestamp: new Date().toISOString(),
        details: { data: { orderFormId, operation, error: errMsg } },
      },
      sessionId
    )
  }

  await next()
}

export async function invalidateSession(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    clients: { checkout, masterdata },
    state: {
      setupRequest: { id },
      redirectUrl,
    },
  } = ctx

  const sessionId =
    ctx.state.setupRequest?.content?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'invalidateSession',
      status: 'start',
      message: 'Starting session invalidation',
      timestamp: new Date().toISOString(),
      details: { data: { setupId: id } },
    },
    sessionId
  )

  try {
    const setupRequest = (
      await masterdata.searchDocuments<PunchOutSetUpRequestDoc>({
        dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
        schema: PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
        fields: PUNCHOUT_SETUP_REQUEST_FIELDS,
        where: `setupId='${encodeURIComponent(id)}'`,
        pagination: {
          page: 1,
          pageSize: 100,
        },
      })
    ).find((doc) => doc.setupId === id)

    try {
      await ctx.clients.masterdata.updateEntireDocument({
        dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
        schema: PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
        id: setupRequest?.id ?? '',
        fields: { ...setupRequest, status: 'used' },
      })

      sendDebugEvent(
        ctx,
        {
          step: 'invalidateSession.markUsed',
          status: 'success',
          message: 'Setup request marked as used in MasterData',
          timestamp: new Date().toISOString(),
          details: { data: { setupId: id, documentId: setupRequest?.id } },
        },
        sessionId
      )
    } catch (e) {
      console.error(e)
      // logger.error(`[obsoleteSession] error : ${JSON.stringify(e, null, 2)}`)
      logToMasterData(
        ctx,
        'obsoleteSession-error',
        setupRequest?.id ?? '',
        'error',
        JSON.stringify(e, null, 2)
      )
      sendDebugEvent(
        ctx,
        {
          step: 'invalidateSession.markUsed',
          status: 'error',
          message: 'Failed to mark setup request as used',
          timestamp: new Date().toISOString(),
          details: {
            data: {
              setupId: id,
              error: e instanceof Error ? e.message : String(e),
            },
          },
        },
        sessionId
      )
    }

    // Set redirect status and header
    // ctx.redirect(redirectUrl ?? '/')
    // ctx.cookies.set('checkout.vtex.com', `__ofid=${ctx.state.orderFormId}`, {
    //   domain: `${ctx.host}`,
    //   path: '/',
    //   maxAge: 86400 * 1000, // 24 hours in milliseconds
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none',
    // })

    const orderFormRaw = await checkout.getOrderFormRaw(ctx.state.orderFormId)

    if (!orderFormRaw) {
      throw new NotFoundError('Order form not found')
    }

    const { headers } = orderFormRaw

    await forwardCheckoutCookies(headers, ctx)

    // Redirect to storefront
    // On master: relative redirect stays on the same domain (stage.mytestdomain2.com)
    // On dev workspace: absolute redirect to FastStore domain (different from workspace URL)
    const isMasterWorkspace = ctx.vtex.workspace === 'master'
    const operation = ctx.state.operation

    // Build the relative path based on operation.
    // Always append ?orderFormId so FastStore can override stale IndexedDB carts.
    let relativePath: string

    if (operation === 'inspect') {
      relativePath = `/checkout/inspect?orderFormId=${ctx.state.orderFormId}`
    } else if (operation === 'edit') {
      relativePath = `/checkout/cart?orderFormId=${ctx.state.orderFormId}`
    } else {
      // Create: homepage, PDP, landing, or custom URL — append orderFormId
      const basePath = redirectUrl ?? '/'
      const separator = basePath.includes('?') ? '&' : '?'

      relativePath = `${basePath}${separator}orderFormId=${ctx.state.orderFormId}`
    }

    let finalRedirectUrl: string

    if (isMasterWorkspace) {
      // On master, the request domain IS the storefront domain — relative redirect works
      finalRedirectUrl = relativePath
    } else {
      // On dev workspace, the request domain is {workspace}--{account}.myvtex.com
      // which is different from the FastStore domain — need absolute redirect
      finalRedirectUrl = `https://stage.mytestdomain2.com${relativePath}`
    }

    // Serve an HTML page that syncs the orderFormId into FastStore's IndexedDB
    // (keyval-store → keyval → fs::cart) before redirecting.
    // Handles 3 cases:
    //   1. Database doesn't exist → onupgradeneeded creates keyval store → write fs::cart
    //   2. Database exists with keyval store → write fs::cart directly
    //   3. Database exists but broken (no keyval store) → delete, recreate, write fs::cart
    ctx.status = 200
    ctx.set('Content-Type', 'text/html')
    ctx.body = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
<p>Loading your session...</p>
<script>
(function() {
  var targetUrl = ${JSON.stringify(finalRedirectUrl)};
  var cartData = {id: ${JSON.stringify(ctx.state.orderFormId)}, items: [], messages: [], shouldSplitItems: true};

  function go() { window.location.href = targetUrl; }

  function writeCart(db) {
    try {
      var tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(cartData, 'fs::cart');
      tx.oncomplete = function() { db.close(); go(); };
      tx.onerror = function() { db.close(); go(); };
    } catch(e) { try { db.close(); } catch(x) {} go(); }
  }

  function openAndWrite() {
    var req = indexedDB.open('keyval-store');
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    };
    req.onsuccess = function(e) {
      var db = e.target.result;
      if (db.objectStoreNames.contains('keyval')) {
        writeCart(db);
      } else {
        db.close();
        var del = indexedDB.deleteDatabase('keyval-store');
        del.onsuccess = function() { openAndWrite(); };
        del.onerror = go;
        del.onblocked = go;
      }
    };
    req.onerror = go;
  }

  try { openAndWrite(); } catch(e) { go(); }
})();
</script>
</body></html>`

    sendDebugEvent(
      ctx,
      {
        step: 'invalidateSession',
        status: 'success',
        message: 'Session invalidated — HTML redirect with IndexedDB clear',
        timestamp: new Date().toISOString(),
        details: {
          data: {
            setupId: id,
            orderFormId: ctx.state.orderFormId,
            redirectUrl: finalRedirectUrl,
            workspace: ctx.vtex.workspace,
            redirectMode: isMasterWorkspace ? 'relative' : 'absolute',
          },
        },
      },
      sessionId
    )

    await next()
  } catch (error) {
    // logger.error(`[obsoleteSession] error : ${error.message}`)
    logToMasterData(
      ctx,
      'obsoleteSession-error',
      id ?? '',
      'error',
      error.message
    )
    sendDebugEvent(
      ctx,
      {
        step: 'invalidateSession',
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        details: { data: { setupId: id } },
      },
      sessionId
    )
    throw new ResolverError(error)
  }
}
