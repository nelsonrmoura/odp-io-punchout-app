/* eslint-disable @typescript-eslint/no-explicit-any */
export async function keepAlive(ctx: Context, next: () => Promise<any>) {
  const {
    clients: { apps },
    query,
  } = ctx

  // If ?diag=1 is passed, return settings diagnostic
  if (query?.diag === '1') {
    try {
      const appId = process.env.VTEX_APP_ID as string
      const settings = await apps.getAppSettings(appId)
      const s = settings as Record<string, unknown>

      ctx.status = 200
      ctx.body = {
        appId,
        workspace: ctx.vtex.workspace,
        account: ctx.vtex.account,
        settings: {
          enablePunchOut: s.enablePunchOut ?? null,
          debugVerboseMode: s.debugVerboseMode ?? null,
          debugWebhookUrl: s.debugWebhookUrl ? '***set***' : null,
          debugWebhookSecret: s.debugWebhookSecret ? '***set***' : null,
          skuTranslateApiUrl: s.skuTranslateApiUrl ? '***set***' : null,
          punchOutIdKey: s.punchOutIdKey ? '***set***' : null,
          punchOutIdToken: s.punchOutIdToken ? '***set***' : null,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = { error: error instanceof Error ? error.message : String(error) }
    }

    ctx.set('Cache-Control', 'no-cache')
    ctx.set('Content-Type', 'application/json')

    await next()

    return
  }

  ctx.status = 200
  ctx.body = 'OK'
  ctx.set('Cache-Control', 'no-cache')

  await next()
}
