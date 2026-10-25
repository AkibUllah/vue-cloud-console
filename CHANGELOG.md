# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Screenshots and an animated walkthrough of the live demo in the README.
- CodeQL code scanning workflow (JavaScript/TypeScript and Actions) and Dependabot updates for npm, Docker and GitHub Actions.
- Roadmap tracked as GitHub issues under the v0.2.0 milestone.
- This changelog.

### Changed

- README bundle size figure corrected to the current production build.

## [0.1.1] - 2026-10-25

### Changed

- The demo is now branded **Demo Cloud**, with `demo@demo.cloud` as the pre-filled sign-in address ([#1](https://github.com/AkibUllah/vue-cloud-console/pull/1)).

## [0.1.0] - 2026-10-25

First public release.

### Added

- Login with session restore and route guards (`next` redirect after sign-in).
- Overview with six SVG quota gauges (warning/critical thresholds), month-to-date and projected spend, daily spend chart and recent activity.
- Instances table with start / stop / reboot / delete, confirmation dialogs and live polling while instances are in a transitional state.
- Launch wizard (image → flavor → network and security groups → key pair → review), validated per step with zod, with image/flavor compatibility filtering, a quota pre-check and an hourly/monthly cost estimate.
- Volumes (create, attach, detach, delete), floating IPs (allocate, associate, disassociate, release) and security groups with a validated rules editor.
- Billing with usage lines, category breakdown, projection and invoices; filterable activity log.
- In-memory mock API with latency, quota enforcement and an activity trail, plus an HTTP client implementing the same `CloudApi` interface.
- Toasts, confirm dialog, dark mode, responsive sidebar; Vitest suite, ESLint, CI on Node 18 and 20, nginx Dockerfile and docker compose.
- Live demo kit: GitHub Pages build, Codespaces dev container and Render blueprint.

### Fixed

- Vite base path and router history honour the build base path, so the app works under a GitHub Pages sub-path.

[Unreleased]: https://github.com/AkibUllah/vue-cloud-console/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/AkibUllah/vue-cloud-console/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/AkibUllah/vue-cloud-console/releases/tag/v0.1.0
