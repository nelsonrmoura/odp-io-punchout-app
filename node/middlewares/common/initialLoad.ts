/* eslint-disable @typescript-eslint/no-explicit-any */
// get the request Order information and load initial apps settings
export async function initialLoad(
  ctx: Context | EvtContext,
  next: () => Promise<any>
) {
  const {
    clients: { apps },
  } = ctx

  // Load the app Settings
  const appId = process.env.VTEX_APP_ID as string
  const appSettings = await apps.getAppSettings(appId)

  // Set the state body for next middlewares
  ctx.state.body = {
    appSettings,
  }

  return next()
}
