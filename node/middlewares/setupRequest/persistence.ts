import {
  AuthenticationError,
  ForbiddenError,
  ResolverError,
  UserInputError,
} from '@vtex/api'
import { json } from 'co-body'
import moment from 'moment'

import {
  buildSetupResponse,
  generateSetupId,
  getAuthenticationStartUrl,
} from '../../modules/setupRequest'
import {
  PUNCHOUT_ORG_UNIT_SEARCH_TERM,
  PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
  PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
} from '../../utils/consts'
import { transformRequest } from '../../parsers/setupRequest/transformRequest'
import { logToMasterData } from '../../utils/Logging'
import { sendDebugEvent } from '../../utils/debugWebhook'

export async function validateCredentials(
  ctx: Context,
  next: () => Promise<void>
) {
  const appKey = ctx.headers['X-VTEX-API-AppKey'.toLowerCase()] as
    | string
    | undefined

  const appToken = ctx.headers['X-VTEX-API-AppToken'.toLowerCase()] as
    | string
    | undefined

  sendDebugEvent(
    ctx,
    {
      step: 'validateCredentials',
      status: 'start',
      message: 'Validating inbound API credentials',
      timestamp: new Date().toISOString(),
      details: {
        request: {
          headers: {
            'x-vtex-api-appkey': appKey ? '***masked***' : '(missing)',
            'x-vtex-api-apptoken': appToken ? '***masked***' : '(missing)',
          },
        },
      },
    },
    'unknown'
  )

  if (!appKey || !appToken) {
    sendDebugEvent(
      ctx,
      {
        step: 'validateCredentials',
        status: 'error',
        message: 'Missing credentials — appKey or appToken absent',
        timestamp: new Date().toISOString(),
      },
      'unknown'
    )
    throw new AuthenticationError('Missing credentials!')
  }

  const {
    clients: { vtexId, apps: settingsClient },
  } = ctx

  const authToken = await vtexId.getAuthToken(appKey, appToken)

  if (authToken?.authStatus !== 'Success' || !authToken.token) {
    logToMasterData(
      ctx,
      'validateCredentials-invalidCredentials',
      '',
      'error',
      'Invalid credentials!'
    )
    sendDebugEvent(
      ctx,
      {
        step: 'validateCredentials',
        status: 'error',
        message: 'Token exchange failed — invalid credentials',
        timestamp: new Date().toISOString(),
        details: { data: { authStatus: authToken?.authStatus ?? 'null' } },
      },
      'unknown'
    )
    throw new AuthenticationError('Invalid credentials!')
  }

  const validation = await vtexId.getAuthId(authToken.token)
  const settings: AppSettings = await settingsClient.getAppSettings(
    process.env.VTEX_APP_ID ?? ''
  )

  if (!(settings.allowedApiKeys ?? []).includes(validation.user)) {
    logToMasterData(
      ctx,
      'validateCredentials-invalidCredentials',
      '',
      'error',
      'Invalid credentials!'
    )
    sendDebugEvent(
      ctx,
      {
        step: 'validateCredentials',
        status: 'error',
        message: 'API key not in allowedApiKeys list',
        timestamp: new Date().toISOString(),
        details: { data: { user: validation.user } },
      },
      'unknown'
    )
    throw new ForbiddenError('Invalid credentials!')
  }

  sendDebugEvent(
    ctx,
    {
      step: 'validateCredentials',
      status: 'success',
      message: 'Credentials validated successfully',
      timestamp: new Date().toISOString(),
      details: { data: { user: validation.user } },
    },
    'unknown'
  )

  await next()
}

export async function validateSetupRequest(
  ctx: Context,
  next: () => Promise<void>
) {
  const sessionId =
    (ctx.state as { inputRawSetupRequest?: PunchOutSetupRequest })
      ?.inputRawSetupRequest?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'validateSetupRequest',
      status: 'start',
      message: 'Parsing and storing raw setup request body',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          baseAuthenticatedDomainQuery: ctx.query.baseAuthenticatedDomain,
          host: ctx.vtex.host,
          workspace: ctx.vtex.workspace,
          account: ctx.vtex.account,
        },
      },
    },
    sessionId
  )

  let body: PunchOutSetupRequest

  try {
    body = (await json(ctx.req)) as PunchOutSetupRequest
  } catch (error) {
    sendDebugEvent(
      ctx,
      {
        step: 'validateSetupRequest',
        status: 'error',
        message: 'Failed to parse request body',
        timestamp: new Date().toISOString(),
        details: {
          data: { error: error instanceof Error ? error.message : String(error) },
        },
      },
      sessionId
    )
    throw error
  }

  ctx.state.inputRawSetupRequest = body
  ctx.state.baseAuthenticatedDomain =
    (ctx.query.baseAuthenticatedDomain as string) ??
    ctx.vtex.host ??
    `${ctx.vtex.workspace}--${ctx.vtex.account}.myvtex.com`

  const resolvedSessionId = body?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'validateSetupRequest',
      status: 'success',
      message: 'Setup request body parsed and stored',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          operation: body?.session?.operation,
          buyerCookie: resolvedSessionId,
          baseAuthenticatedDomain: ctx.state.baseAuthenticatedDomain,
          hasSenderUsername: !!body?.session?.header?.sender?.username,
          itemCount: body?.session?.body?.items?.length ?? 0,
        },
      },
    },
    resolvedSessionId
  )

  await next()
}

export async function validateSetupRequestUser(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    state: { inputRawSetupRequest },
    clients: { vtexAuthValidator },
  } = ctx

  const sessionId =
    inputRawSetupRequest?.session?.header?.buyerCookie ?? 'unknown'

  const {
    username,
    sharedSecret: password,
  } = inputRawSetupRequest.session.header.sender

  sendDebugEvent(
    ctx,
    {
      step: 'validateSetupRequestUser',
      status: 'start',
      message: 'Validating setup request user credentials',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          username,
          // password intentionally omitted / masked
        },
      },
    },
    sessionId
  )

  const { isValid } = await vtexAuthValidator.validateCredentials(
    username,
    password
  )

  if (!isValid) {
    sendDebugEvent(
      ctx,
      {
        step: 'validateSetupRequestUser',
        status: 'error',
        message: 'User credentials are invalid',
        timestamp: new Date().toISOString(),
        details: { data: { username } },
      },
      sessionId
    )
    throw new ForbiddenError('Invalid user!')
  }

  sendDebugEvent(
    ctx,
    {
      step: 'validateSetupRequestUser',
      status: 'success',
      message: 'User credentials validated successfully',
      timestamp: new Date().toISOString(),
      details: { data: { username } },
    },
    sessionId
  )

  await next()
}

export async function handleB2bSession(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    state: { inputRawSetupRequest: content },
    clients: { masterdata, vtexB2bOrgUnit, customLicenseManager },
  } = ctx

  const contractId = content?.session?.body?.billing?.id
  // const punchOutType = content?.session?.header?.punchOutType
  const userName = content?.session?.header?.marketsiteUser

  const userEmail = content.session.header.sender.username
  const sessionId = content?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'handleB2bSession',
      status: 'start',
      message: 'Starting B2B session lookup',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          userEmail,
          contractId: contractId ?? null,
        },
      },
    },
    sessionId
  )

  // TODO: UserLevel and Org level may change

  // if (!['UserLevel', 'OrgLevel'].includes(punchOutType)) {
  //   throw new UserInputError(
  //     '[handleB2bSession] Invalid punchOutType'
  //   )
  // }

  if (!contractId) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: 'Missing contractId in billing body',
        timestamp: new Date().toISOString(),
      },
      sessionId
    )
    throw new UserInputError('[handleB2bSession] Invalid contractId')
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
    ],
    pagination: {
      page: 1,
      pageSize: 100,
    },
    where: `corporateDocument='${encodeURIComponent(contractId)}'`,
  })

  if (!contractList) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: `No contract found for contractId ${contractId}`,
        timestamp: new Date().toISOString(),
        details: { data: { contractId } },
      },
      sessionId
    )
    throw new UserInputError(
      `[handleB2bSession] Invalid contractId for ${contractId}`
    )
  }

  if (contractList.length > 1) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: `Multiple contracts found for contractId ${contractId}`,
        timestamp: new Date().toISOString(),
        details: { data: { contractId, count: contractList.length } },
      },
      sessionId
    )
    throw new UserInputError(
      `[handleB2bSession] Multiple contracts found contact support for ${contractId}`
    )
  }

  const contract = contractList.find((item) => item)

  if (!contract) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: 'Contract list returned empty result',
        timestamp: new Date().toISOString(),
        details: { data: { contractId } },
      },
      sessionId
    )
    throw new UserInputError('[handleB2bSession] Invalid contractId')
  }

  if (!userEmail) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: 'Missing user email in POSR sender',
        timestamp: new Date().toISOString(),
      },
      sessionId
    )
    throw new UserInputError(
      '[handleB2bSession] Invalid user email in the POSR'
    )
  }

  // Retry org unit lookup — this VTEX B2B API is intermittently returning empty results
  let orgUnitList: Awaited<ReturnType<typeof vtexB2bOrgUnit.getScopesByContract>> = []
  const maxRetries = 5

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Use forceNoCache on retries to bypass VTEX IO ExternalClient memoization
    if (attempt > 1) {
      orgUnitList = await vtexB2bOrgUnit.getScopesByContractNoCache(
        'contractIds',
        contract.id,
        attempt
      )
    } else {
      orgUnitList = await vtexB2bOrgUnit.getScopesByContract(
        'contractIds',
        contract.id
      )
    }

    if (orgUnitList.length > 0) {
      if (attempt > 1) {
        sendDebugEvent(
          ctx,
          {
            step: 'handleB2bSession',
            status: 'success',
            message: `Org unit lookup succeeded on attempt ${attempt}/${maxRetries}`,
            timestamp: new Date().toISOString(),
            details: { data: { contractId, orgUnitCount: orgUnitList.length } },
          },
          sessionId
        )
      }

      break
    }

    if (attempt < maxRetries) {
      sendDebugEvent(
        ctx,
        {
          step: 'handleB2bSession',
          status: 'start',
          message: `Org unit lookup returned empty (attempt ${attempt}/${maxRetries}), retrying in ${attempt * 2}s...`,
          timestamp: new Date().toISOString(),
          details: { data: { contractId, contractDocumentId: contract.id, attempt } },
        },
        sessionId
      )
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
    }
  }

  sendDebugEvent(
    ctx,
    {
      step: 'handleB2bSession',
      status: 'success',
      message: 'Contract and org units resolved',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          contractId,
          contractDocumentId: contract.id,
          orgUnitCount: orgUnitList.length,
          orgUnitNames: orgUnitList.map((u: { name: string }) => u.name),
          userEmail,
        },
      },
    },
    sessionId
  )

  const usersOfAllUnits = await Promise.all(
    orgUnitList.map((unit) =>
      vtexB2bOrgUnit.getOrganizationUserByOrgUnitId(unit.id)
    )
  )

  // TODO: This is a temporary check for the user's assignment for any org unit. Replace this with
  // a single API call to get all the org units the user is assigned to.
  if (
    usersOfAllUnits.some((unit) =>
      unit.users.some((user) => user.login === userEmail)
    )
  ) {
    await next()

    return
  }

  const selectedOrgUnit = orgUnitList.filter((item) =>
    item.name
      .toLowerCase()
      .includes(PUNCHOUT_ORG_UNIT_SEARCH_TERM.toLowerCase())
  )

  if (selectedOrgUnit.length !== 1) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: `Unexpected org unit count for term "${PUNCHOUT_ORG_UNIT_SEARCH_TERM}"`,
        timestamp: new Date().toISOString(),
        details: { data: { found: selectedOrgUnit.length } },
      },
      sessionId
    )
    throw new UserInputError(
      `[handleB2bSession] Found ${selectedOrgUnit.length} orgs for ${PUNCHOUT_ORG_UNIT_SEARCH_TERM}`
    )
  }

  const orgUnitId = selectedOrgUnit[0].id

  if (!orgUnitId) {
    sendDebugEvent(
      ctx,
      {
        step: 'handleB2bSession',
        status: 'error',
        message: 'Selected org unit has no id',
        timestamp: new Date().toISOString(),
        details: { data: { orgUnitName: selectedOrgUnit[0].name } },
      },
      sessionId
    )
    throw new UserInputError(
      `[handleB2bSession] Invalid orgUnitId for ${PUNCHOUT_ORG_UNIT_SEARCH_TERM}`
    )
  }

  const orgUnitUserList = await vtexB2bOrgUnit.getOrganizationUserByOrgUnitId(
    orgUnitId
  )

  const orgUnitUser = orgUnitUserList.users.find(
    (user: { login: string }) => user.login === userEmail
  )

  console.info('orgUnitUser', JSON.stringify(orgUnitUser, null, 2))

  if (!orgUnitUser) {
    // TODO: create user in license manager and add to organization
    const user = await customLicenseManager.createUser(userEmail, `${userName}`)

    console.info('Assigning user to org unit')

    await vtexB2bOrgUnit.addUserToOrganization(orgUnitId, user.id)

    console.info('Assigned user to org unit')
  }

  await next()
}

export async function handleSetupRequestPersistance(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    state: { inputRawSetupRequest },
    clients: { masterdata },
  } = ctx

  const sessionId =
    inputRawSetupRequest?.session?.header?.buyerCookie ?? 'unknown'

  sendDebugEvent(
    ctx,
    {
      step: 'handleSetupRequestPersistance',
      status: 'start',
      message: 'Persisting setup request to MasterData',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          operation: inputRawSetupRequest?.session?.operation,
          buyerCookie: sessionId,
        },
      },
    },
    sessionId
  )

  const jsonData = inputRawSetupRequest

  const setupId = await generateSetupId()
  const expiresIn = moment().add(1, 'hour')

  const parsedRequest = await transformRequest(jsonData)

  const response = await masterdata.createDocument({
    dataEntity: PUNCHOUT_SETUP_REQUEST_ENTITY_NAME,
    schema: PUNCHOUT_SETUP_REQUEST_SCHEMA_NAME,
    fields: {
      setupId,
      content: parsedRequest,
      status: 'pending',
      expiresIn: expiresIn.format(),
    },
  })

  if (!response.DocumentId) {
    logToMasterData(
      ctx,
      'handleSetupRequestPersistance-error',
      '',
      'error',
      'Something went wrong while persisting the setup request.'
    )
    sendDebugEvent(
      ctx,
      {
        step: 'handleSetupRequestPersistance',
        status: 'error',
        message: 'MasterData createDocument returned no DocumentId',
        timestamp: new Date().toISOString(),
        details: { data: { setupId } },
      },
      sessionId
    )
    throw new ResolverError(
      'Something went wrong while persisting the setup request.'
    )
  }

  const startUrl = await getAuthenticationStartUrl(parsedRequest, setupId, ctx)

  // TODO - Need to pass the corrrect properties to build the PunchOutSetupResponse //

  const setupResponse = buildSetupResponse(
    parsedRequest,
    startUrl.replace('http://', 'https://')
  )

  sendDebugEvent(
    ctx,
    {
      step: 'handleSetupRequestPersistance',
      status: 'success',
      message: 'Setup request persisted and response built',
      timestamp: new Date().toISOString(),
      details: {
        data: {
          setupId,
          documentId: response.DocumentId,
          startUrl: startUrl.replace('http://', 'https://'),
          expiresIn: expiresIn.format(),
        },
      },
    },
    sessionId
  )

  ctx.set('Content-Type', 'application/xml')

  ctx.status = 200
  ctx.body = setupResponse

  await next()
}
