interface AppSettings {
  enablePunchOut: boolean
  allowedApiKeys: string[]
  punchOutIdKey: string
  punchOutIdToken: string
  punchOutWebMethodsUrl: string
  punchOutWebMethodsUserId: string
  punchOutWebMethodsPassword: string
  skuTranslateApiUrl?: string
  debugVerboseMode?: boolean
  debugWebhookUrl?: string
  debugWebhookSecret?: string
}
