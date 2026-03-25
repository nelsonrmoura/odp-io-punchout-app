import { json } from 'co-body'

import {
  PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
  PUNCHOUT_SETUP_REQUEST_FIELDS,
  PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
} from '../../utils/consts'
import { logToMasterData } from '../../utils/Logging'

export const setPunchoutSession = async (
  ctx: Context,
  next: () => Promise<void>
) => {
  const {
    req,
    clients: { checkout: checkoutClient, masterdata },
  } = ctx

  const body: PunchoutSessionInput = await json(req)
  const orderFormId = body?.checkout?.orderFormId?.value ?? null
  const storeUserEmail = body?.authentication?.storeUserEmail?.value ?? null

  if (!orderFormId || !storeUserEmail) {
    // logger.error('No orderFormId or storeUserEmail')
    // logToMasterData(
    //   ctx,
    //   'setPunchoutSession-noOrderFormIdOrStoreUserEmail',
    //   orderFormId ?? '',
    //   'error',
    //   'No orderFormId or storeUserEmail'
    // )

    ctx.response.body = {
      punchout: {
        marketsiteUser: {
          value: null,
        },
        operation: {
          value: null,
        },
        punchOutType: {
          value: null,
        },
        punchOutFlags: {
          value: null,
        },
      },
    }
    ctx.response.status = 200

    return
  }

  const orderForm = await checkoutClient.getOrderForm(orderFormId)

  const punchoutCustomData = orderForm?.customData?.customApps?.find(
    (customApp) => customApp.id === 'punch-out'
  )

  const setupRequestId = punchoutCustomData?.fields?.setupRequestId

  if (!setupRequestId) {
    // logger.error('No setupRequestId')
    logToMasterData(
      ctx,
      'setPunchoutSession-noSetupRequestId',
      setupRequestId ?? '',
      'error',
      'No setupRequestId'
    )

    ctx.response.body = {
      punchout: {
        marketsiteUser: {
          value: null,
        },
        operation: {
          value: null,
        },
        punchOutType: {
          value: null,
        },
        punchOutFlags: {
          value: null,
        },
      },
    }
    ctx.response.status = 200

    return
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
      where: `setupId='${encodeURIComponent(setupRequestId)}'`,
    })
  ).find((item) => item)

  if (!setupRequest) {
    // logger.error('No setupRequest')
    logToMasterData(
      ctx,
      'setPunchoutSession-noSetupRequest',
      '',
      'error',
      'No setupRequest'
    )

    ctx.response.body = {
      punchout: {
        marketsiteUser: {
          value: null,
        },
        operation: {
          value: null,
        },
        punchOutType: {
          value: null,
        },
        punchOutFlags: {
          value: null,
        },
      },
    }
    ctx.response.status = 200

    return
  }

  const {
    content: {
      session: {
        header: { marketsiteUser, punchOutType },
        operation,
      },
    },
  } = setupRequest

  // Fallback: real cXML curl payload puts `custom` in session.body.custom, not session.custom
  const customData =
    setupRequest.content.session.custom ??
    setupRequest.content.session.body?.custom

  const views = customData?.security?.views

  ctx.response.body = {
    punchout: {
      marketsiteUser: {
        value: marketsiteUser,
      },
      operation: {
        value: operation,
      },
      punchOutType: {
        value: punchOutType,
      },
      punchOutFlags: {
        value: views,
      },
    },
  }

  ctx.response.status = 200

  await next()
}
