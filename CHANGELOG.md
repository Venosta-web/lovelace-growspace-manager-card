# [1.1.0-next.18](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.17...v1.1.0-next.18) (2026-06-05)


### Bug Fixes

* expand to standard view when entering edit mode from header-only mode ([1dcff0e](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/1dcff0e4a2f293f88b32cd6b5f6ed0f20fea16fb))
* **fan-controller:** snap cleared VPD override slot to default; extend deriveDefaultStage ([1b4918e](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/1b4918ed531a697a8fdd156ce4cb57768dfc9a16))
* fetch history for calculated VPD sensors when no explicit VPD sensor is configured ([0bb28d2](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/0bb28d2e1aabf7d7eb3c92790550873e44270819))
* **stage-vpd:** clearing an input now removes the stage override instead of silently ignoring ([ca3e569](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/ca3e5694b003ee81b178fd088ca80541965d14c9))


### Features

* add stage selector to New Plant wizard schedule step ([78cabc3](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/78cabc324e0c3fe819a2c51d1adfbc416bbf3925))
* add stage-aware VPD configuration toggle to fan settings ([ef122a4](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/ef122a4b68ba03e5434937047cf0e3e9c2a3076e))
* **chips:** allow hiding chips by type via card editor ([8fa9795](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/8fa979592f8d049f17cfa5a81e51426ddaaadf21))
* **environment:** add tank-water-chart + route MetricKey.WATER in analytics UI ([66978bf](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/66978bffe177666ee3f3ca2cf70a54f4a3961f86)), closes [#231](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/231)
* **irrigation:** conditionally show Cycle Parameters and Skip During Dark based on crop steering mode ([1d68549](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/1d68549ea6ea595040839c6179229eefb02bb96d))
* **metrics:** wire tank-derived water chip end-to-end ([3293a74](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/3293a74dec2ace9c6ac919661635325b304bd3b4))
* stage VPD overrides table in fan controller config ([#228](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/228)) ([20c524e](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/20c524e4e62ba7d3862ba3c8ae240cd2e8da3ae8))
* sum multiple power/energy sensors instead of showing "Multiple" ([585c0d9](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/585c0d98c5a9a6ac99e30f18a06778ae17e9b004))

# [1.1.0-next.17](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.16...v1.1.0-next.17) (2026-06-04)


### Bug Fixes

* **device-state:** handle numeric states in light sensor and on/off normalizers; add coverage tests ([e56416f](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/e56416f48aed56797c683e72b6ff1ee73093c7a7))
* improve sensor data normalization and handling for fan entities and boundary values ([c46d220](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/c46d220f2448b75cafa467469468f93ad0b680ce))
* update nutrient selection logic and styling in nutrient presets editor ([d52f848](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/d52f8489dc272506a170a18c8fb665ffa498affc))


### Features

* add component tests and visual regression screenshots for FeedAndWaterDialog ([954ba73](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/954ba7313b05d3e02b29b287d1d6eb85cd4cf366))
* add LabelPreview Lit component with real QR, layout modes, and snapshot tests ([2db3086](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/2db308627b5b102c056dc65669f7b2d647f79d8f)), closes [#209](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/209)
* add library error handling and display to AddPlantsDialog during batch submission ([7ed40d6](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/7ed40d6c9ed002d7a0f8798d2c958c389584a6e6))
* add optional nutrient fields to updateNutrientStock service and tests ([8b949ae](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/8b949aedf99b462028c1d39b0d10e421a8385d38))
* add PrinterStatusStrip shared component with getPrinters helper ([ba0028a](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/ba0028a7a6798ef22bd39f4fb210487dc72241c0))
* add sensor mapping constants for substrate EC, runoff EC, drain volume, and irrigation flow ([ae1ac73](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/ae1ac7366a7f0914219c831b456f30cecbfcc757))
* add status strip, size selector, and density to BatchPrintLabelDialog (issue [#212](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/212)) ([a7432b3](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/a7432b32f3822fb05e69487e3c4cc54f9188710a))
* add support for power, ph, and feed_ec metrics to history store and mapping configurations ([4d353dc](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/4d353dc62f854610dca16b831f055420cd5fe3cc))
* add week, ec_target, ph_target to NutrientPresetsSchema and mutator ([#409](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/409)) ([c574a6d](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/c574a6d9b1e644240a58955305d02195caefd554))
* **fan-controller:** panel UI + save flow ([#221](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/221)) ([556fa57](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/556fa57ca817e20bb00c556df6879b60ab8cd633))
* **fan-controller:** wire CirculationFanConfig data pipeline ([#220](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/220)) ([1d71875](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/1d718751c2ae12db992346bc48f5700017a521f8))
* Feed & Water Dialog - Watering tab end-to-end ([#215](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/215)) ([6bc5df7](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/6bc5df73e1f6fb17a7bf29c31eadb454b2e18fff))
* Feed & Water Dialog shell + SM scaffold ([#214](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/214)) ([630a8c5](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/630a8c5ab58949f959dc6bd17b3f7d3756df55b9))
* **feed-and-water-dialog:** port inventory tab SM from nutrient dialog ([#216](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/216)) ([5c0ddd1](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/5c0ddd119dae39865e7275ec1ac2b7c719999660))
* **feed-and-water-dialog:** port presets tab SM from nutrient dialog ([#217](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/217)) ([25016fa](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/25016fa3e3969e23205d992d5f4637a09cecfb8f))
* **feed-and-water:** retire growspace-watering-dialog-ui and nutrient-dialog ([#219](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/219)) ([31036f6](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/31036f653567f3310200bf66e1b66578df1cd358)), closes [#218](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/218)
* implement fan entity percentage detection and display in metrics and charts ([6863cf4](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/6863cf436b727767dd3c3e4b5cd088a28d6fad89))
* improve add-plants batch error handling and add registration tests for custom cards ([1d1534f](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/1d1534fe81691231e230af9b3819977536cff8aa))
* include circulationFanConfig in environment configuration payload and service call ([7b66d30](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/7b66d30990293d16fce18423400d6e5aa3aff86f))
* nutrients dialog UI rewrite — left-rail nav + master/detail ([#213](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/213)) ([85f9fc9](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/85f9fc982be2032c2d28e55c71424b7dd0fce168))
* rework PrintLabelDialog to Layout A (issue [#211](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/211)) ([1be4df4](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/1be4df497a7473ff13a659d139664f67ba0dc5ad))
* support orphaned nutrient rows by adding name tracking and UI badges for missing stock items. ([4f77193](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/4f77193cbdb7325e9ad0b63179bdcf35be48dad3))
* support percentage-based light sensor readings in env charts ([0371eaf](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/0371eaf7734488ce1ff640b45435c9ce35f968a7))
* switch NutrientPreset items to nutrient_id references ([#410](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/410)) ([374a17d](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/374a17d64138c24075f916335f73c39420790e5e))

# [1.1.0-next.16](https://github.com/Venosta-web/lovelace-growspace-manager-card/compare/v1.1.0-next.15...v1.1.0-next.16) (2026-05-30)


### Features

* implement grow report export and fetch functionality in growspace slice and remove legacy report API tests ([564d45d](https://github.com/Venosta-web/lovelace-growspace-manager-card/commit/564d45d8892b4986f6f7652ed5e614d9eace10b3))

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
