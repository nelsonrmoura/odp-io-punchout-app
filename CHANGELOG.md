# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.9-beta] - 2026-03-21

- Fixed session middleware crash when `custom` block is in `session.body.custom` instead of `session.custom` (fallback read pattern added)
- Fixed address and profile data not applied to OrderForm after punchout auth redirect (uncommented address/profile update calls)

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

- Addes the custom data update endpoint to `checkout` client.
- Add edit cart feature.
- Added VTEX MD logging
- Added the keep-alive service
- Added logging settings
- Added PunchOut flags to session
- Added vendor SKU support
- Added support for inspect cart
- Allowed multiple API keys to use the PunchOut route
- Allowed base authenticated domain support

### Updated

- Updated the function name and the clients.
- Updated the get user from the vtexId.
- Updated the odp host to select based on enviroment.
- Updated the `persistSetupRequest` request with the new request object.

### Removed

- Remove the odp host configuration from mainfest.
- Removed unnecessary logs

### Fixed

- Fixed the lint issues.
- Increased timeout for VTEX checkout
- Used password format for sensitive app data
- Moved B2B-related logic before authentication
- Used the new end-point to get org units of contract
- Increased timeout for SKU reference check
- Fixed security flags not stored in session
- Fixed order form address not being set
- Handled undefined allowed API keys

## [0.0.1] - 2025-03-10

### Added

- Added basic setup request persistence
- Added the create cart endpoint
- Added VTEX pre-authenticated user flow start

### Changed

- Changed the vendor name to `odp`

### Fixed

- Added typing for setup request
- Hashed password
- Fixed status not updating to used
- Fixed setup response
