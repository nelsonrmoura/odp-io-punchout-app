import { AuthenticationError, UserInputError } from '@vtex/api'

import { logToMasterData } from '../../utils/Logging'

export async function validateAuthenticatedUser(
  ctx: Context,
  next: () => Promise<void>
) {
  const {
    clients: { vtexId },
    vtex: { storeUserAuthToken },
  } = ctx

  if (!storeUserAuthToken) {
    // logger.error('[validateAuthenticatedUser] User not logged in')
    logToMasterData(
      ctx,
      'validateAuthenticatedUser-token',
      '',
      'error',
      'User not logged in'
    )
    throw new AuthenticationError(
      '[validateAuthenticatedUser] User not logged in'
    )
  }

  const authData = await vtexId.getAuthId(storeUserAuthToken)

  if (!authData?.id || !authData?.user) {
    // logger.error('[validateAuthenticatedUser] Invalid user data')
    logToMasterData(
      ctx,
      'validateAuthenticatedUser-authData',
      '',
      'error',
      'Invalid user data'
    )
    throw new UserInputError('[validateAuthenticatedUser] Invalid user data')
  }

  ctx.state.user = {
    id: authData.id,
    email: authData.user,
  }

  await next()
}
