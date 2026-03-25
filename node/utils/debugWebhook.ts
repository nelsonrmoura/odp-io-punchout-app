/**
 * Debug Verbose Webhook Utility
 *
 * Sends structured step-by-step debug events to a configured webhook URL.
 * Only active when `debugVerboseMode` is true and `debugWebhookUrl` is set in app settings.
 * Never sends keys, tokens, secrets, passwords, or cookie values — all are masked.
 * Fire-and-forget: failures do NOT affect the main request flow.
 *
 * Uses ctx.clients.odpSkuTranslate.sendDebugEvent() (ExternalClient) instead of raw
 * Node.js https because VTEX IO blocks raw outbound HTTP on published apps.
 */

export interface DebugEvent {
  step: string
  status: 'start' | 'success' | 'error'
  message: string
  timestamp: string
  details?: {
    request?: {
      method?: string
      url?: string
      headers?: Record<string, string>
      body?: unknown
    }
    response?: {
      status?: number
      headers?: Record<string, string>
      body?: unknown
    }
    data?: unknown
  }
}

/** Fields whose keys (case-insensitive) must always be masked. */
const SENSITIVE_KEY_PATTERNS = [
  /appkey/i,
  /apptoken/i,
  /sharedsecret/i,
  /punchoutidkey/i,
  /punchoutidtoken/i,
  /punchoutwebmethodspassword/i,
  /vtexidclientautcookie/i,
  /^token$/i,
  /^secret$/i,
  /^password$/i,
]

const MASK = '***masked***'

/**
 * Recursively masks any object key that matches a sensitive pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maskSensitiveData(value: unknown): any {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(maskSensitiveData)
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) =>
        pattern.test(k)
      )

      result[k] = isSensitiveKey ? MASK : maskSensitiveData(v)
    }

    return result
  }

  return value
}

/**
 * Sends a debug event to the configured webhook URL using the ExternalClient.
 *
 * @param ctx - VTEX IO service context (used to read appSettings and access clients)
 * @param event - The debug event payload
 * @param sessionId - Buyer cookie / session correlation ID
 */
export function sendDebugEvent(
  ctx: Context,
  event: DebugEvent,
  sessionId = 'unknown'
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appSettings: AppSettings | undefined = (ctx.state as any)?.body
      ?.appSettings

    const debugVerboseMode = appSettings?.debugVerboseMode
    const debugWebhookUrl = appSettings?.debugWebhookUrl
    const debugWebhookSecret = appSettings?.debugWebhookSecret

    if (!debugVerboseMode || !debugWebhookUrl) {
      return
    }

    const maskedEvent: DebugEvent = {
      ...event,
      details: event.details ? maskSensitiveData(event.details) : undefined,
    }

    const payload = {
      sessionId,
      event: maskedEvent,
    }

    // Use ExternalClient (ctx.clients.odpSkuTranslate) for outbound HTTP
    // Raw Node.js https is blocked on VTEX IO published apps
    ctx.clients.odpSkuTranslate
      .sendDebugEvent(debugWebhookUrl, payload, debugWebhookSecret)
      .catch(() => {
        // Intentionally swallowed — debug webhook failures must never break the main flow
      })
  } catch {
    // Catch any synchronous errors — never break the main flow
  }
}
