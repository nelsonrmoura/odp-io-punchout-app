# ODP PunchOut IO App

VTEX IO app that enables B2B punchout integration for Office Depot. Handles the complete server-side punchout lifecycle: receiving cXML setup requests, authenticating B2B users, managing cart state, syncing with FastStore's IndexedDB, and processing punchback transfers.

**App:** `odp.punch-out`
**Account:** `odpstage`
**Current Version:** `0.0.31-beta`

---

## Table of Contents

- [Architecture](#architecture)
- [Punchout Flow](#punchout-flow)
  - [Setup Request (Persist)](#1-setup-request-persist)
  - [Authentication and Cart Creation](#2-authentication-and-cart-creation)
  - [IndexedDB Sync and Redirect](#3-indexeddb-sync-and-redirect)
  - [Transfer Cart (Punchback)](#4-transfer-cart-punchback)
- [Operations](#operations)
  - [Create](#create)
  - [Edit](#edit)
  - [Inspect](#inspect)
- [Session Transform](#session-transform)
- [IndexedDB Cart Sync](#indexeddb-cart-sync)
- [Routes and Endpoints](#routes-and-endpoints)
- [Middleware Chains](#middleware-chains)
- [Clients](#clients)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Known Issues](#known-issues)
- [Related Documentation](#related-documentation)

---

## Architecture

```
Procurement System (Coupa/Ariba)
        │
        │ POST /_v/private/punch-out/persist-setup-request
        ▼
┌──────────────────────────────────────────────────────┐
│                  VTEX IO App                         │
│                                                      │
│  persist-setup-request                               │
│    ├─ validateCredentials (API key/token)             │
│    ├─ validateSetupRequest (parse cXML body)          │
│    ├─ validateSetupRequestUser (VTEX ID lookup)       │
│    ├─ handleB2bSession (org unit + contract)          │
│    └─ handleSetupRequestPersistance (MasterData)      │
│         └─ Returns startUrl with OTT                 │
│                                                      │
│  handle-setup-request (after OTT auth)               │
│    ├─ validateAuthenticatedUser                      │
│    ├─ patchSession (refresh vtex_session)             │
│    ├─ retrieveSetupHandler (fetch from MasterData)    │
│    ├─ skuReferenceDecoder (ODP SKU → VTEX SKU)       │
│    ├─ cartHandler (create OrderForm, add items)       │
│    ├─ patchSessionWithOrderForm (edit/inspect only)   │
│    └─ invalidateSession                              │
│         └─ HTML page: sync IndexedDB + redirect      │
│                                                      │
│  handle-transfer-cart-request (punchback)             │
│    ├─ handleCors                                     │
│    ├─ validateAuthenticatedUser                      │
│    ├─ retrieveOrderformId                            │
│    ├─ skuReferenceEncoder (VTEX SKU → ODP SKU)       │
│    └─ convertOrderFormToWebMethods (cXML response)    │
│                                                      │
│  session/transform (VTEX session framework)          │
│    └─ setPunchoutSession                             │
│         └─ Returns operation, flags, punchOutType    │
└──────────────────────────────────────────────────────┘
        │
        │ HTML redirect with IndexedDB sync
        ▼
┌──────────────────────────────────────────────────────┐
│                  FastStore (Browser)                  │
│                                                      │
│  IndexedDB: keyval-store → keyval → fs::cart         │
│    {id: orderFormId, items: [], ...}                 │
│                                                      │
│  Checkout pages:                                     │
│    @vtex/checkout reads ?orderFormId from URL        │
│    → fetches OrderForm from API                      │
│    → updateCartFromOrderForm() syncs to IndexedDB    │
│                                                      │
│  Non-checkout pages (homepage, PDP, PLP):            │
│    @faststore/core reads fs::cart from IndexedDB     │
│    → uses cart.id to fetch from API                  │
└──────────────────────────────────────────────────────┘
        │
        │ POST /_v/private/punch-out/handle-transfer-cart-request
        ▼
Procurement System receives cXML punchback
```

---

## Punchout Flow

### 1. Setup Request (Persist)

The procurement system sends a cXML setup request to create a punchout session.

```
POST /_v/private/punch-out/persist-setup-request
Headers: X-VTEX-API-AppKey, X-VTEX-API-AppToken
Body: { session: { header: {...}, operation: "create|edit|inspect", body: {...} } }
```

**Middleware chain:** `initialLoad → validateCredentials → validateSetupRequest → validateSetupRequestUser → handleB2bSession → handleSetupRequestPersistance`

The app:
1. Validates API credentials against allowed keys in app settings
2. Parses the cXML body and extracts operation, items, shipping, billing
3. Looks up the B2B user via VTEX ID API using the sender's email
4. Resolves the B2B org unit and contract via the Organization Units API (with retry for flaky API)
5. Persists the setup request to MasterData
6. Returns a `startUrl` containing a one-time authentication token (OTT)

### 2. Authentication and Cart Creation

The browser opens the `startUrl`. VTEX authenticator validates the OTT and redirects to `handle-setup-request`.

**Middleware chain:** `initialLoad → validateAuthenticatedUser → patchSession → retrieveSetupHandler → skuReferenceDecoder → cartHandler → patchSessionWithOrderForm → invalidateSession`

The app:
1. Verifies the user is authenticated (auth cookies present)
2. Refreshes the VTEX session via `POST /api/sessions`
3. Fetches the setup request from MasterData
4. Translates ODP vendor SKU references to VTEX SKU IDs via the SKU Translation API
5. Creates a new OrderForm, applies profile and address, adds items (edit/inspect)
6. Writes `setupRequestId` to OrderForm custom data (`customData.punch-out`)
7. For edit/inspect: patches the VTEX session with `checkout.orderFormId` to trigger the session transform
8. Marks the setup request as "used" in MasterData

### 3. IndexedDB Sync and Redirect

Instead of a simple HTTP 302, the app serves an HTML page that:

1. Opens (or creates) the `keyval-store` IndexedDB database
2. Writes `{id: orderFormId, items: [], messages: [], shouldSplitItems: true}` to the `fs::cart` key
3. Navigates to the target URL via `window.location.href`

This ensures FastStore reads the correct orderFormId from IndexedDB on any page (not just checkout). See [IndexedDB Cart Sync](#indexeddb-cart-sync) for details.

### 4. Transfer Cart (Punchback)

When the user clicks "Transfer Cart" on the FastStore checkout page:

```
POST /_v/private/punch-out/handle-transfer-cart-request
Body: { orderFormId: "..." }
```

**Middleware chain:** `handleCors → initialLoad → validateAuthenticatedUser → retrieveOrderformId → skuReferenceEncoder → convertOrderFormToWebMethods`

The app:
1. Fetches the OrderForm from the Checkout API
2. Reads the `setupRequestId` from custom data, fetches the original setup request
3. Translates VTEX SKU IDs back to ODP vendor SKU references
4. Converts to cXML format
5. Sends to the procurement system's punchback URL (from the original setup request header)

---

## Operations

### Create

User browses the catalog and builds a cart from scratch.

- **Redirect:** `/?orderFormId={id}` (homepage), `/office-supplies?orderFormId={id}` (landing), or `/product/p?orderFormId={id}` (PDP)
- **OrderForm:** empty cart, profile and address pre-filled
- **Session data:** `punchout.operation = "create"` (available after checkout loads)

### Edit

User reviews and modifies a pre-populated cart.

- **Redirect:** `/checkout/cart?orderFormId={id}` (FastStore routes to `/checkout/punchout?orderFormId={id}`)
- **OrderForm:** pre-populated with items, quantities, and prices from the procurement system
- **Session data:** `punchout.operation = "edit"` (available immediately — session patched server-side)

### Inspect

User views a cart in read-only mode (no modifications, no punchback).

- **Redirect:** `/checkout/inspect?orderFormId={id}` (route must be created by SI)
- **OrderForm:** pre-populated with items (same as edit)
- **Session data:** `punchout.operation = "inspect"`
- **UI:** quantity controls disabled, remove buttons hidden, TransferCart button hidden

---

## Session Transform

The app registers a VTEX session transform at `/_v/punchout/session/transform`.

**Configuration** (`vtex.session/configuration.json`):

```json
{
  "punchout": {
    "input": {
      "authentication": ["storeUserEmail"],
      "checkout": ["orderFormId"]
    },
    "output": {
      "punchout": ["marketsiteUser", "operation", "punchOutType", "punchOutFlags"]
    }
  }
}
```

**How it works:**

1. VTEX session framework detects both `storeUserEmail` and `checkout.orderFormId` in the session
2. Calls `/_v/punchout/session/transform` with these values
3. The `setPunchoutSession` middleware:
   - Fetches the OrderForm using the `orderFormId`
   - Reads `customData.punch-out.setupRequestId`
   - Fetches the original setup request from MasterData
   - Returns `operation`, `punchOutType`, `marketsiteUser`, `punchOutFlags`
4. These values become available in the `punchout` session namespace

**Reading the session data:**

```
GET /api/sessions?items=punchout.operation,punchout.punchOutType,punchout.punchOutFlags
```

---

## IndexedDB Cart Sync

FastStore uses two different sources for the orderFormId depending on the page type:

| Page Type | Source |
|-----------|--------|
| Checkout (`/checkout/*`) | URL `?orderFormId` param (via `@vtex/checkout` `useExtension()`) |
| Non-checkout (homepage, PDP, PLP) | IndexedDB `keyval-store → keyval → fs::cart → {id}` (via `@faststore/core` `useCart_unstable()`) |

The IO app syncs the orderFormId to IndexedDB on every new punchout session to ensure:

1. **Session isolation:** new sessions don't inherit carts from previous sessions
2. **Cart persistence:** edit/inspect carts survive navigation from checkout to homepage

**How it works:**

The `invalidateSession` middleware serves an HTML page instead of an HTTP 302 redirect. The inline JavaScript:

1. Opens the `keyval-store` IndexedDB database
2. If the database doesn't exist: creates it with the `keyval` object store (via `onupgradeneeded`)
3. If the database is broken (exists but no `keyval` store): deletes and recreates
4. Writes `{id: orderFormId, items: [], messages: [], shouldSplitItems: true}` to the `fs::cart` key
5. Redirects to the target URL

**Cart persistence on navigation:**

When the checkout page loads with `?orderFormId`, `@vtex/checkout` fetches the OrderForm from the API. FastStore's `updateCartFromOrderForm()` then syncs the full cart (with items) back to IndexedDB. When the user navigates to the homepage, `@faststore/core` reads `fs::cart` from IndexedDB and finds the correct cart with items.

---

## Routes and Endpoints

| Route | Path | Method | Public | Purpose |
|-------|------|--------|--------|---------|
| `persistSetupRequest` | `/_v/private/punch-out/persist-setup-request` | POST | Yes | Receive cXML setup request |
| `handleSetupRequest` | `/_v/private/punch-out/handle-setup-request` | GET | Yes | Process setup, create cart, redirect |
| `handleTransferCartRequest` | `/_v/private/punch-out/handle-transfer-cart-request` | POST, OPTIONS | Yes | Punchback to procurement system |
| `setPunchoutSession` | `/_v/punchout/session/transform` | POST | Yes | Session transform |
| `keepAlive` | `/_v/punch-out/keep-alive` | GET | Yes | Health check (`?diag=1` for diagnostics) |

---

## Middleware Chains

### `persistSetupRequest` (POST)

```
initialLoad → validateCredentials → validateSetupRequest → validateSetupRequestUser → handleB2bSession → handleSetupRequestPersistance
```

### `handleSetupRequest` (GET)

```
initialLoad → validateAuthenticatedUser → patchSession → retrieveSetupHandler → skuReferenceDecoder → cartHandler → patchSessionWithOrderForm → invalidateSession
```

### `handleTransferCartRequest` (POST)

```
handleCors → initialLoad → validateAuthenticatedUser → retrieveOrderformId → skuReferenceEncoder → convertOrderFormToWebMethods
```

### `setPunchoutSession` (POST)

```
initialLoad → setPunchoutSession
```

---

## Clients

| Client | File | Purpose |
|--------|------|---------|
| `SessionClient` | `clients/session.ts` | Patch/read VTEX session (`/api/sessions`) |
| `CheckoutClient` | `clients/checkout.ts` | OrderForm CRUD (`/api/checkout/pub/orderForm`) |
| `VtexIdClient` | `clients/vtexId.ts` | User lookup (`/api/vtexid`) |
| `VtexIdPunchoutClient` | `clients/vtexIdPunchout.ts` | Punchout auth token |
| `VtexB2BOrgUnitClient` | `clients/VtexB2BOrgUnitClient.ts` | B2B org units (with retry) |
| `OdpSkuTranslateClient` | `clients/odpSkuTranslate.ts` | SKU translation API |
| `OdpWebMethodsClient` | `clients/odpWebMethods.ts` | WebMethods punchback |
| `SkuReferenceClient` | `clients/skuReference.ts` | SKU reference lookup |
| `CustomLicenseManager` | `clients/customLicenseManger.ts` | License Manager API |
| `VtexAuthValidator` | `clients/vtexAuthValidator.ts` | Auth validation |

---

## Project Structure

```
io-punchout-main/
├── manifest.json                    # App manifest (version, policies, settings)
├── CHANGELOG.md
├── README.md
├── vtex.session/
│   └── configuration.json           # Session transform config
├── masterdata/
│   └── ...                          # MasterData schema for setup requests
├── node/
│   ├── index.ts                     # Service definition (routes, events, clients)
│   ├── service.json                 # Runtime config (memory, timeout, replicas)
│   ├── clients/                     # External API clients
│   ├── handlers/
│   │   └── setupEnvironment.ts      # App install/link event handler
│   ├── middlewares/
│   │   ├── common/
│   │   │   ├── handlers.ts          # validateAuthenticatedUser
│   │   │   └── initialLoad.ts       # App settings loader
│   │   ├── setupRequest/
│   │   │   ├── handler.ts           # retrieveSetupHandler, cartHandler, patchSessionWithOrderForm, invalidateSession, skuReferenceDecoder
│   │   │   └── persistence.ts       # validateCredentials, validateSetupRequest, handleB2bSession, handleSetupRequestPersistance
│   │   ├── transferCart/
│   │   │   └── handler.ts           # retrieveOrderformId, skuReferenceEncoder, convertOrderFormToWebMethods, handleCors
│   │   ├── session/
│   │   │   └── setPunchoutSession.ts # Session transform endpoint
│   │   └── keepAlive/
│   │       └── index.ts             # Health check
│   ├── modules/
│   │   └── orderForm.ts             # addItemsToCart, updateOrderFormWithProfile, updateOrderFormWithAddress
│   ├── parsers/
│   │   └── setupRequest/
│   │       └── punchOutToVtex.ts     # parseProfileAndRedirect, buildAddressData, getProductRedirectUrl
│   ├── utils/
│   │   ├── consts.ts                # MasterData entity/schema names
│   │   ├── index.ts                 # forwardCheckoutCookies, forwardSessionCookies
│   │   ├── Logging.ts               # logToMasterData
│   │   └── debugWebhook.ts          # sendDebugEvent (SSE to procurement app)
│   └── typings/                     # TypeScript type definitions
└── docs/                            # Related documentation
```

---

## Configuration

### App Settings (`manifest.json` → `settingsSchema`)

| Setting | Description |
|---------|-------------|
| `enablePunchOut` | Enable/disable punchout functionality |
| `allowedApiKeys` | API keys authorized to call persist-setup-request |
| `punchOutIdKey` | VTEX App Key for punchout user authentication |
| `punchOutIdToken` | VTEX App Token for punchout user authentication |
| `punchOutWebMethodsUserId` | WebMethods User ID for punchback |
| `punchOutWebMethodsPassword` | WebMethods Password for punchback |
| `skuTranslateApiUrl` | URL for the ODP SKU Translation API |
| `debugWebhookUrl` | URL for debug event webhook (SSE) |
| `debugWebhookSecret` | Secret for debug webhook authentication |
| `logSettings` | Logging configuration (type, levels) |

### Runtime (`node/service.json`)

- Memory: 1024 MB
- Workers: 1
- Replicas: 2-20 (auto-scaling)
- Default client timeout: 2000 ms

---

## Known Issues

| # | Issue | Impact | Status |
|---|-------|--------|--------|
| 1 | `SameSite=Lax` on VTEX cookies | Iframe punchout mode blocked | Workaround: New Tab mode. Needs VTEX platform fix. |
| 2 | B2B Org Unit API intermittent 400 | Setup needs retries (~40% failure on first attempt) | Mitigated with 5x retry + backoff. Needs VTEX API fix. |
| 3 | Phantom cart item (SKU 9994649, $0.00) | Extra item from B2B user profile in edit/inspect carts | Under investigation. |

---

## Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| SI Instructions | `docs/si-faststore-punchout-instructions.md` | What Brightdome/SI needs to build in FastStore |
| VTEX Platform Requirements | `docs/vtex-platform-requirements-for-punchout.md` | Requirements for VTEX Product Team |
| B2B API Investigation | `docs/vtex-b2b-api-flaky-auth-investigation.md` | B2B org unit API intermittent 401 analysis |
| Changelog | `CHANGELOG.md` | Version history |
