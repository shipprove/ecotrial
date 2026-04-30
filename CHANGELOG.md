# Changelog

All notable changes to EcoTrial will be documented in this file.

This project intends to follow a Changesets-style or equivalent manual release discipline before publishing packages.

## Unreleased

### Added

- Initial repository documentation for EcoTrial.
- Initial user-facing README covering product scope, planned CLI, security, privacy, contribution notes, and license.
- Dogfood MVP implementation with TypeScript CLI foundation, config loading, local downstream preparation, package-json rewrite candidate injection, bounded command execution, terminal/JSON reports, and `pnpm dogfood`.

### Notes

- The CLI is not published yet, and the GitHub Action is not released yet.
- The first implementation target is a Node.js 20+, TypeScript, pnpm-based MVP for npm package downstream compatibility testing.
