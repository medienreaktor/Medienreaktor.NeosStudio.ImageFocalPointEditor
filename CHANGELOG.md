# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **The editor takes Neos Studio's design tokens.** The image area, marker and
  messages follow Studio's light and dark theme through its semantic CSS
  variables instead of rules of their own under `html.dark`.
- Text sizes come from Studio's `--text-*` variables, so the editor follows
  the reader's default font size, and its sizes sit on Studio's 16px spacing
  scale.
- Requires Neos Studio 1.19.1.
- The Composer package leaves out the CI configuration.

## [v1.0.0] - 2026-09-30

### Added

- **The image focal point editor for Neos Studio**, a drop-in port of the
  classic UI's `JvMTECH.Neos.ImageFocalPointEditor`: the same editor id, the
  same `imageProperty` option (including `parent:`) and the same stored JSON
  value, so existing node type configuration works in Studio unchanged.

[Unreleased]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.ImageFocalPointEditor/compare/v1.0.0...HEAD
[v1.0.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.ImageFocalPointEditor/releases/tag/v1.0.0
