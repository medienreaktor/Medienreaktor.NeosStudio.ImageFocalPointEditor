# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-11-10

### Added

- **Neos Studio 2.** The editor runs in Neos Studio 2 as well as in 1.19.1 and later
  (`medienreaktor/neos-studio` `^1.19.1 || ^2.0`). It asks the plugin API which
  version it runs in and takes the node address and the API that come with it:
  Neos.Api 2 in Studio 2, Medienreaktor.NeosApi 1.x in Studio 1.

### Changed

- The plugin API types come from npm (`@medienreaktor/neos-studio`) instead of a
  `file:` path into an installed Studio, so the plugin builds anywhere.

## [1.1.0] - 2026-11-05

### Changed

- **The editor takes Neos Studio's design tokens.** The image area, marker and
  messages follow Studio's light and dark theme through its semantic CSS
  variables instead of rules of their own under `html.dark`.
- Text sizes come from Studio's `--text-*` variables, so the editor follows
  the reader's default font size, and its sizes sit on Studio's 16px spacing
  scale.
- Requires Neos Studio 1.19.1.
- The Composer package leaves out the CI configuration.

## [1.0.0] - 2026-09-30

### Added

- **The image focal point editor for Neos Studio**, a drop-in port of the
  classic UI's `JvMTECH.Neos.ImageFocalPointEditor`: the same editor id, the
  same `imageProperty` option (including `parent:`) and the same stored JSON
  value, so existing node type configuration works in Studio unchanged.

[Unreleased]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.ImageFocalPointEditor/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.ImageFocalPointEditor/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.ImageFocalPointEditor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.ImageFocalPointEditor/releases/tag/v1.0.0
