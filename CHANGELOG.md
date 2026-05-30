# [1.1.0-next.15](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.14...v1.1.0-next.15) (2026-05-30)


### Features

* implement Genetics slice with schemas and tests while consolidating legacy API modules ([17a584f](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/17a584f5eaf3beaaa3aba8470ff759858533aa2c))

# [1.1.0-next.14](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.13...v1.1.0-next.14) (2026-05-30)


### Bug Fixes

* ensure edit mode banner remains visible during transplant mode ([51e2985](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/51e2985150823775819159fb702817d1df087822))


### Features

* add support to toggle transplant mode and update edit banner visibility ([78f881b](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/78f881bc17629d2e35c8e37b7674238a78a2ac3e))

# [1.1.0-next.13](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.12...v1.1.0-next.13) (2026-05-30)


### Features

* add library-tag and field-hint styles and update button color variables in seeds-genetics-tab ([5d33dfd](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/5d33dfd894285077363301c11ed1c6742a0a70f5))

# [1.1.0-next.12](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.11...v1.1.0-next.12) (2026-05-30)


### Features

* remove Mark All Read button and add no-pad class to inbox layout with accompanying tests ([13ee296](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/13ee2968ef163cfdca961530710b1982223b8b91))

# [1.1.0-next.11](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.10...v1.1.0-next.11) (2026-05-29)


### Features

* implement responsive inbox panel with dedicated mobile variant and updated tests ([74b0e6e](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/74b0e6e92cfefba185949229fad873f5ffea0959))

# [1.1.0-next.10](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.9...v1.1.0-next.10) (2026-05-29)


### Features

* implement breeder manager state machine and add corresponding unit tests ([619d384](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/619d384b40234ba68e6954e16a29f9b171b1ed05))

# [1.1.0-next.9](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.8...v1.1.0-next.9) (2026-05-29)


### Features

* add crop steering dialog and update state machine logic ([bdf7188](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/bdf718862f5a1d275a6ab4ffefcbd1e19c8bc875))

# [1.1.0-next.8](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.7...v1.1.0-next.8) (2026-05-29)


### Features

* implement AddPlantDialog state machine for improved dialog logic and testability ([5317683](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/531768333926aa0ae9682aa7a91371364751042d))

# [1.1.0-next.7](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.6...v1.1.0-next.7) (2026-05-29)


### Features

* add seeds genetics dialog and update transplant state machine to support idle entry point ([054c8b4](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/054c8b4b426200f8ba8ae80aa8447927994cbfa1))

# [1.1.0-next.6](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.5...v1.1.0-next.6) (2026-05-29)


### Bug Fixes

* disable edit mode when initiating transplant mode in grid and manager cards ([165556e](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/165556eb0b4a274e8cd299eac83a93e7e5ac284b))

# [1.1.0-next.5](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.4...v1.1.0-next.5) (2026-05-29)


### Features

* add briefingError state to GmBriefingPanel with retry functionality and UI handling ([4c4db3a](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/4c4db3ab177fb387b3e6d6d70758efa45fce5aa9))

# [1.1.0-next.4](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.3...v1.1.0-next.4) (2026-05-29)


### Features

* **inbox:** add Mark All Read button with click handler ([4e63ffe](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/4e63ffef67cdd6ffb300a882d839cefc22995edf)), closes [#182](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/182)
* update relative timestamp display and add visual regression tests for mark-all-read functionality ([66769b3](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/66769b3da5dac9153c6f99621648494f86139ae9))

# [1.1.0-next.3](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.2...v1.1.0-next.3) (2026-05-29)


### Bug Fixes

* handle rate_limited errors in AI services by displaying a UI toast instead of throwing exceptions ([fda3404](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/fda34044a994f688290cbdef40a2d6fbbe4f1ca0))
* make description field nullable in AI insight schema ([eaaf64a](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/eaaf64a93335839f0a99ca888ffe6da6fc48b91b))
* prevent redundant controller initialization in GrowspaceDialogHost with an idempotency guard and added unit tests. ([083f3cb](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/083f3cb3ef9f32a64d02481bb1e814a821de1680))
* set min-height to 90vh in grow-master-dialog to prevent layout collapse ([9e0cb40](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/9e0cb40340797cb95765ec0a7b778e6775f2b61b))
* update ec_target_ranges property keys to match API schema in growspace-adapter unit tests ([e6a8eed](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/e6a8eed403b5f64db3f846fdb132449259fd5679))


### Features

* add image attachment support, error handling, and message bubble thumbnails to chat panel ([fc8cb5e](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/fc8cb5e80b5eeed9a3efa2a0a2c3bd816844fe9a))
* add new conversation button to chat panel with reset functionality ([2409da3](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/2409da3605ffed9949106c1d28810154e1737105))
* add refresh briefing action and pass growspace identifiers to dialog host ([8422994](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/84229940e66e0f94baf30ce18b0df5aecf664d42))
* add settings panel and navigation to grow-master-dialog with configuration save support ([b5ddbb2](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/b5ddbb26b7b8eee21f503d61dd5a1a803674c4ac))
* add strain import dialog and update related unit tests ([483a2d9](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/483a2d9ff0add45685135a73af77860a1d6c49b4))
* add UI handling for unconfigured AI agent across chat, briefing, and inbox panels ([5b740b1](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/5b740b129886d54aecbd26fdefe70205477ffdc7))
* implement AI agent configuration flow with entity picker in briefing and chat panels ([971249d](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/971249d8c830b0aa7bc5e35b45211c84de7dd9f5))
* implement AI chat panel with mode-switching UI and add cross-reference support for pollination donors ([399a363](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/399a363e9d8b0b5eeb1812fdba3b31959c88dea1))
* implement conversation thread pinning and automatic eviction for AI insight chats ([85a0515](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/85a05158c6d480562eb63c7337f9668fb24c2bcb))
* implement conversation, alert management, and briefing functionality in AI insight slice ([58fec35](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/58fec356846036228a5f3c83cc391cc4b94ce1f5))
* implement inbox and briefing panels with associated test coverage and UI components ([b339578](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/b339578281f8c67e7aefc2d9c6ee113a87ab1b3d))
* implement tab navigation logic and add unit tests for briefing panel ([a10335f](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/a10335f3ac85a89d56bd4b3eef439a519fb89211))
* implement three-mode AI shell with chat, briefing, and inbox support in GrowMasterDialog ([67a59b8](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/67a59b881791088e3bffa80ee5cd3bbfe273fd18))

# [1.1.0-next.2](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.1...v1.1.0-next.2) (2026-05-27)


### Features

* implement undo functionality with toast notifications and Ctrl+Z keyboard support ([2410f12](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/2410f122a82265577f2e45d2ca13f21a6d6da717))

# [1.1.0-next.1](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.0.31...v1.1.0-next.1) (2026-05-26)


### Features

* automate versioning and releases using semantic-release on main and dev branches ([2f26dfb](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/2f26dfb11d2b05d0d3b259f2087e933e786c0c72))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.30-alpha.1] - 2026-01-16

### Added
- Integrated AI assistant (Grow Master) for context-aware gardening advice
- Smart irrigation management with crop steering strategies
- Strain recommendation system based on environmental conditions
- Integrated Pest Management (IPM) dialog with customizable presets
- Dehumidifier automation with stage-specific VPD/humidity setpoints
- Real-time environmental analytics with historical sparklines
- Light cycle history visualization
- Undo/Redo system for plant operations
- Keyboard shortcuts for power users
- Glassmorphism design with premium aesthetics
- Mobile-responsive layout with adaptive list view
- Batch plant operations (watering, training, deletion)
- Drag-and-drop plant repositioning
- Strain library with visual genetics management
- Nutrient inventory tracking
- Timeline and logbook features

### Fixed
- TypeScript build errors in dialog host
- ESLint unused variable warnings
- Empty interface type definitions
- Regex escape character warnings
- **Test failures in `growspace-header.spec.ts`** - Added missing `loadHistoryOnDemand` mock to history store (28/28 tests now passing)

### Changed
- Migrated to Nanostore state management
- Improved type safety across codebase
- **Enhanced type safety in `plant-timeline.ts`** - Replaced 14 `any` type assertions with proper discriminated union type narrowing for `PlantTimelineEvent`
- Enhanced error handling in API calls

## [Unreleased]

### Planned
- Multi-language support
- Dark mode refinements
- Additional chart types for analytics
- Complete type safety improvements across all components
