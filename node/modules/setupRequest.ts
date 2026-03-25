import { v4 as uuidv4 } from 'uuid'
import { UserInputError } from '@vtex/api'

export function buildSetupResponse(
  request: PunchOutSetupRequest,
  startUrl: string
): PunchOutSetupResponse {
  return {
    session: {
      buyerCookie: request.session.header.buyerCookie,
      startUrl,
    },
  }
}

export const generateSetupId = async (): Promise<string> => {
  return `setup-${uuidv4()}`
}

export const getUsernameFromSetupRequest = (
  setupRequest: PunchOutSetupRequest
) =>
  [setupRequest.session.header.sender.username].find((item: string) =>
    item.includes('@')
  ) ?? ''

export const getAuthenticationStartUrl = async (
  setupRequest: PunchOutSetupRequest,
  setupId: string,
  ctx: Context
) => {
  const {
    clients: { vtexIdPunchOut: vtexIdClient, apps: appClient },
  } = ctx

  const username = getUsernameFromSetupRequest(setupRequest)

  const handlerUrl = `https://${ctx.state.baseAuthenticatedDomain}/_v/private/punch-out/handle-setup-request?setupId=${setupId}`
  const settings: AppSettings = await appClient.getAppSettings(
    process.env.VTEX_APP_ID ?? ''
  )

  if (!username) {
    throw new UserInputError('Username not found!')
  }

  const startUrlResponse = await vtexIdClient.startAuth({
    username,
    returnUrl: handlerUrl,
    key: settings.punchOutIdKey,
    token: settings.punchOutIdToken,
    baseDomain: ctx.state.baseAuthenticatedDomain,
  })

  return startUrlResponse.url
}
