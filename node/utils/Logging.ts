/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LINKED } from '@vtex/api'

/* eslint-disable no-console */
export const logToMasterData = async (
  ctx: Pick<Context, 'clients' | 'vtex' | 'state'>,
  step: string,
  identification: string,
  type: string,
  message: any = {}
) => {
  const {
    state: {
      body: { appSettings },
    },
  } = ctx

  switch (type) {
    case 'error':
      LINKED && console.error(`*** ${step}: ${identification}`, message)
      // ctx.vtex.logger.error({ method: step, identification, error: message })
      // If logError is not enabled not logging must be done
      if (!appSettings?.logSettings?.logError) {
        return
      }

      break

    case 'info':
      LINKED && console.info(`*** ${step}: ${identification}`, message)
      // ctx.vtex.logger.info({ method: step, identification, message })
      if (!appSettings?.logSettings?.logInfo) {
        return
      }

      break

    case 'warn':
      LINKED && console.warn(`*** ${step}: ${identification}`, message)
      // ctx.vtex.logger.info({ method: step, identification, message })

      // If logWarn is not enabled not logging must be done
      if (!appSettings?.logSettings?.logWarn) {
        return
      }

      break

    case 'debug':
      LINKED && console.debug(`*** ${step}: ${identification}`, message)
      // ctx.vtex.logger.info({ method: step, identification, message })

      // If logDebug is not enabled not logging must be done
      if (!appSettings?.logSettings?.logDebug) {
        return
      }

      break

    default:
      LINKED && console.log(`*** ${step}: ${identification}`, message)
      // ctx.vtex.logger.info({ method: step, identification, message })
      break
  }

  let stringMessage

  if (typeof message === 'string') {
    stringMessage = message
  } else if (message?.isAxiosError || message?.response?.data) {
    stringMessage = JSON.stringify({
      message: message.message,
      stack: message.stack,
      response: message.response?.data,
      config: {
        url: message.config?.url,
        method: message.config?.method,
        data: message.config?.data,
        headers: message.config?.headers,
        params: message.config?.params,
        baseURL: message.config?.baseURL,
      },
    })
  } else if (message instanceof Error) {
    stringMessage = JSON.stringify({
      message: message.message,
      stack: message.stack,
      name: message.name,
    })
  } else {
    stringMessage = JSON.stringify(message || {})
  }

  const fields = {
    step,
    identification,
    type,
    message: stringMessage,
  }

  try {
    ctx.clients.masterdata.createDocument({
      dataEntity: 'PL',
      fields,
    })
  } catch (err) {
    ctx.vtex.logger.error({
      error: err,
      data: {
        fields,
      },
      message: `Failed to log error to Master Data in step: ${step}`,
    })
    LINKED && console.error('Failed to log to MasterData:', err)
  }
}
