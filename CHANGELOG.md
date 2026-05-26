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
