import type {
  ClientsConfig,
  ServiceContext,
  RecorderState,
  Cached,
  EventContext,
  IOContext,
  SegmentData,
} from '@vtex/api'
import { LRUCache, method, Service } from '@vtex/api'

import { Clients } from './clients'
import { setupAppEnvironment } from './handlers/setupEnvironment'
import {
  handleB2bSession,
  handleSetupRequestPersistance,
  validateCredentials,
  validateSetupRequest,
  validateSetupRequestUser,
} from './middlewares/setupRequest/persistence'
import {
  cartHandler,
  invalidateSession,
  patchSession,
  patchSessionWithOrderForm,
  retrieveSetupHandler,
  skuReferenceDecoder,
} from './middlewares/setupRequest/handler'
import { validateAuthenticatedUser } from './middlewares/common/handlers'
import {
  convertOrderFormToWebMethods,
  handleCors,
  retrieveOrderformId,
  skuReferenceEncoder,
} from './middlewares/transferCart/handler'
import { setPunchoutSession } from './middlewares/session/setPunchoutSession'
import { keepAlive } from './middlewares/keepAlive'
import { initialLoad } from './middlewares/common/initialLoad'

const TIMEOUT_MS = 2000

const memoryCache = new LRUCache<string, Cached>({ max: 5000 })

metrics.trackCache('status', memoryCache)

// This is the configuration for clients available in `ctx.clients`.
const clients: ClientsConfig<Clients> = {
  // We pass our custom implementation of the clients bag, containing the Status client.
  implementation: Clients,
  options: {
    // All IO Clients will be initialized with these options, unless otherwise specified.
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
    // This key will be merged with the default options and add this cache to our Status client.
    status: {
      memoryCache,
    },
  },
}

declare global {
  interface CustomIOContext extends IOContext {
    segment?: SegmentData
    orderFormId?: string
    ownerId?: string
  }
  // We declare a global Context type just to avoid re-writing ServiceContext<Clients, State> in every handler and resolver
  type Context = ServiceContext<Clients, State>

  type EvtContext = EventContext<Clients>

  // The shape of our State object found in `ctx.state`. This is used as state bag to communicate between middlewares.
  interface State extends RecorderState {
    code: number
    user: {
      id: string
      email: string
    }
    setupRequest: {
      id: string
      content: PunchOutSetupRequest
      status: string
    }
    redirectUrl: string
    orderFormId: string
    inputRawSetupRequest: PunchOutSetupRequest
    baseAuthenticatedDomain: string
    operation: string
    xRef: string
    itemList: string[]
    crossRefItemList: Array<{ skuId: string | null; vendorSkuId: string }>
    sessionToken: string
    segmentToken: string
    contract: Contract
  }
}

// Export a service that defines route handlers and client options.
export default new Service({
  clients,
  events: {
    onAppsLinked: setupAppEnvironment,
    onAppInstalled: setupAppEnvironment,
    onSettingsChanged: setupAppEnvironment,
  },
  routes: {
    persistSetupRequest: method({
      POST: [
        initialLoad,
        validateCredentials,
        validateSetupRequest,
        validateSetupRequestUser,
        handleB2bSession,
        handleSetupRequestPersistance,
      ],
    }),
    handleSetupRequest: method({
      GET: [
        initialLoad,
        validateAuthenticatedUser,
        patchSession,
        retrieveSetupHandler,
        skuReferenceDecoder,
        cartHandler,
        patchSessionWithOrderForm,
        invalidateSession,
      ],
    }),
    handleTransferCartRequest: method({
      POST: [
        handleCors,
        initialLoad,
        validateAuthenticatedUser,
        retrieveOrderformId,
        skuReferenceEncoder,
        convertOrderFormToWebMethods,
      ],
      OPTIONS: [handleCors],
    }),
    setPunchoutSession: method({
      POST: [initialLoad, setPunchoutSession],
    }),
    keepAlive: method({
      GET: [keepAlive],
    }),
  },
})
