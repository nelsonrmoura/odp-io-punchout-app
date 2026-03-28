# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.31-beta] - 2026-03-28

### Added

- IndexedDB cart sync on every punchout redirect: HTML page writes `{id: orderFormId, items: [], ...}` to `keyval-store → keyval → fs::cart` before navigating to FastStore, ensuring session isolation and cart persistence
- Handles all 3 IndexedDB states: database doesn't exist (creates `keyval` store via `onupgradeneeded`), database exists with `keyval` store (writes directly), database broken without `keyval` store (deletes and recreates)
- `?orderFormId` appended to ALL redirect URLs including create flows (homepage, landing, PDP), not just edit/inspect

### Changed

- Redirect mechanism changed from HTTP 302 to HTML page with inline JavaScript for IndexedDB sync before navigation

## [0.0.30-beta] - 2026-03-28

### Fixed

- Handle broken `keyval-store` database (exists but 0 object stores): delete and let FastStore recreate

## [0.0.29-beta] - 2026-03-28

### Changed

- IndexedDB strategy changed from deleting `fs::cart` key to writing the correct orderFormId (overwrite stale data instead of removing)

## [0.0.28-beta] - 2026-03-28

### Fixed

- Handle broken `keyval-store` database state left by 0.0.26-beta (database exists but missing `keyval` object store)

## [0.0.27-beta] - 2026-03-28

### Changed

- IndexedDB strategy: delete only `fs::cart` key (correct key name with double colon `fs::cart`) instead of entire database
- Preserves other FastStore IndexedDB data (`fs::session`, `fs::deliveryPromise`, `fs::searchHistory`)

## [0.0.26-beta] - 2026-03-28

### Changed

- IndexedDB strategy: delete entire `keyval-store` database (same as FastStore Cypress tests) to clear all stale cart data

### Known Issue

- Deleting entire database breaks FastStore initialization — checkout page renders from API but IndexedDB stays empty

## [0.0.25-beta] - 2026-03-28

### Added

- HTML redirect page with IndexedDB `fs:cart` key deletion before navigating to FastStore (first attempt — wrong key name, single colon)
- `?orderFormId` query parameter appended to create flow redirect URLs (homepage, landing page, PDP)

### Changed

- Create flow redirects now include `?orderFormId={id}` (was only edit/inspect before)

## [0.0.24-beta] - 2026-03-28

### Added

- `?orderFormId` query parameter on create flow redirect URLs

## [0.0.23-beta] - 2026-03-28

### Added

- Session transform verification loop in `patchSessionWithOrderForm`: retries up to 5x to confirm `punchout.operation` is populated before redirect
- `getSessionItems()` method on `SessionClient` to read session back after patching

### Note

- Verification loop was found unnecessary — session data is populated by FastStore's checkout SDK client-side, not by the server-side patch

## [0.0.22-beta] - 2026-03-28

### Fixed

- TypeScript error: changed `status: 'skipped'` to `status: 'success'` in `patchSessionWithOrderForm` debug event (type only allows `'start' | 'success' | 'error'`)

## [0.0.21-beta] - 2026-03-27

### Added

- `patchSessionWithOrderForm` middleware: patches VTEX session with `checkout.orderFormId` after `cartHandler` for edit/inspect flows, triggering the session transform server-side before the user reaches the storefront
- `SessionClient.patchSessionWithOrderFormId()`: new method sends `{ public: { checkout: { orderFormId: { value } } } }` to `POST /api/sessions` with auth + session cookies
- Redirect URLs changed for edit/inspect: edit → `/checkout/cart?orderFormId={id}`, inspect → `/checkout/inspect?orderFormId={id}`

## [0.0.20-beta] - 2026-03-26

### Added

- Debug webhook via ExternalClient to Railway procurement app for real-time SSE event streaming
- `sendDebugEvent()` utility with step/status/message/details structure
- Debug events throughout the middleware chain: persist, SKU decode, cart handler, session, invalidation

## [0.0.19-beta] - 2026-03-26

### Fixed

- B2B org unit API retry mechanism: 5 attempts with exponential backoff (2s/4s/6s/8s) and cache-busting query params to bypass ExternalClient memoization
- Level 2 PDP redirect: Catalog REST API lookup with lowercase `LinkId` (78ms response)

## [0.0.18-beta] - 2026-03-25

### Added

- SKU translation via ExternalClient to Railway procurement app (ODP SKU refs ↔ VTEX SKU IDs)
- Prefix-based mock translation: `SKU-UAT-ODP-{vtexSkuId}` ↔ `{vtexSkuId}`
- App settings: `skuTranslateApiUrl` for configurable SKU translation API endpoint
- Edit/inspect cart: seller `odpseller`, webMethods attachment support

## [0.0.17-beta] - 2026-03-25

### Added

- Mock punchback: `session.mockWebmethods === true` flag controls mock vs real WebMethods integration
- Diagnostic endpoint: `/_v/punch-out/keep-alive?diag=1` returns app version, workspace, settings

## [0.0.16-beta] - 2026-03-24

### Changed

- Redirect logic: on master workspace uses relative redirect (same domain), on dev workspace uses absolute redirect to `stage.mytestdomain2.com`
- Forward checkout cookies (`checkout.vtex.com`) from OrderForm API response to browser

## [0.0.15-beta] - 2026-03-24

### Fixed

- Profile and address application order: apply profile FIRST, then re-fetch OrderForm to get `availableAddresses`, then build and apply address data
- Address matching against `availableAddresses` for correct shipping data

## [0.0.14-beta] - 2026-03-23

### Added

- `skuReferenceDecoder` middleware: translates ODP vendor SKU reference IDs to VTEX SKU IDs before adding items to cart
- Cross-reference item list with `vendorSkuId` and `skuId` mapping

## [0.0.13-beta] - 2026-03-23

### Added

- Items added to cart for edit/inspect operations via `addItemsToCart()` in `cartHandler`
- Item quantities and prices from cXML body applied to OrderForm

## [0.0.12-beta] - 2026-03-22

### Changed

- Session transform (`setPunchoutSession`): fallback reads `custom` from `session.body.custom` when not at `session.custom` (real cXML payloads differ from test payloads)

## [0.0.11-beta] - 2026-03-22

### Added

- `patchSession` middleware: refreshes `vtex_session` and `vtex_segment` cookies via `POST /api/sessions` during `handle-setup-request`
- `forwardSessionCookies` utility to propagate session cookies from API response to browser

## [0.0.10-beta] - 2026-03-22

### Added

- `initialLoad` middleware for app settings initialization
- `validateAuthenticatedUser` middleware to verify auth cookies before processing setup request

## [0.0.9-beta] - 2026-03-21

### Fixed

- Session middleware crash when `custom` block is in `session.body.custom` instead of `session.custom` (fallback read pattern added)
- Address and profile data not applied to OrderForm after punchout auth redirect (uncommented address/profile update calls)

## [0.0.8] - 2025-12-18

- Remove conditional for domain on master workspace

## [0.0.7] - 2025-12-11

- Used the Checkout headers to set the cookie
- Removed setting profile/address in orderForm and used user token
- Fixed session data went to WM
- Handled selectedItem null value

## [0.0.5] - 2025-10-20

### Fixed

- Used the app token to access the Checkout API

## [0.0.4] - 2025-10-02

## [0.0.3] - 2025-09-17

### Fixed

- Fixed missing `setupRequest.content` in `handleTransferCartRequest` middleware chain by adding `skuReferenceEncoder` middleware
- Fixed `skuReferenceEncoder` to retrieve setup request without incorrect `status='used'` filter
- Fixed CORS issues for `handleTransferCartRequest` endpoint by adding proper CORS middleware and OPTIONS method support
- Fixed CORS credentials issue by using specific origin instead of wildcard when `Access-Control-Allow-Credentials` is true
- Fixed linting errors including Prettier formatting and missing blank lines

## [0.0.2] - 2025-09-16

### Added

- Custom data update endpoint to `checkout` client
- Edit cart feature
- VTEX MasterData logging
- Keep-alive service
- Logging settings
- PunchOut flags to session
- Vendor SKU support
- Inspect cart support
- Multiple API keys for PunchOut route
- Base authenticated domain support

### Changed

- Updated function names and clients
- Updated get user from vtexId
- Updated ODP host selection based on environment
- Updated `persistSetupRequest` with new request object

### Removed

- ODP host configuration from manifest
- Unnecessary logs

### Fixed

- Lint issues
- Increased timeout for VTEX checkout
- Used password format for sensitive app data
- Moved B2B-related logic before authentication
- Used new endpoint to get org units of contract
- Increased timeout for SKU reference check
- Security flags not stored in session
- Order form address not being set
- Handled undefined allowed API keys

## [0.0.1] - 2025-03-10

### Added

- Basic setup request persistence
- Create cart endpoint
- VTEX pre-authenticated user flow start

### Changed

- Vendor name to `odp`

### Fixed

- Typing for setup request
- Hashed password
- Status not updating to used
- Setup response
