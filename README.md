# Medienreaktor.NeosStudio.ImageFocalPointEditor

The image focal point editor for **Neos Studio** (`Medienreaktor.NeosStudio`):
click into the image to set the point that has to stay visible when the image
is cropped by its container.

It is a **drop-in replacement** for the classic-UI
[JvMTECH.Neos.ImageFocalPointEditor](https://github.com/jvm-tech/Neos.ImageFocalPointEditor)
(`jvmtech/neos-imagefocalpointeditor`): it registers under the same editor id,
reads the same `editorOptions.imageProperty` and stores the same value. One
node type configuration serves both interfaces, and both packages can be
installed side by side - the original serves the classic UI, this one serves
Studio.

## Installation

```bash
composer require --no-update medienreaktor/neos-studio-image-focal-point-editor
```

Then run `composer update` in your project root and flush the Flow caches.

The classic-UI package is a dependency: it provides the
`JvMTECH.Neos.ImageFocalPointEditor:ObjectPosition` Fusion prototype the
frontend renders the stored point with, which stays untouched.

## Configuration

Unchanged from the classic-UI editor:

```yaml
properties:
  heroImage:
    type: Neos\Media\Domain\Model\ImageInterface
    ui:
      reloadIfChanged: true
      inspector:
        group: 'hero'
  heroImageFocalPoint:
    type: string
    ui:
      label: 'Focal point'
      # Without it the preview only shows the new point after a manual reload.
      reloadIfChanged: true
      inspector:
        group: 'hero'
        hidden: 'ClientEval:node.properties.heroImage == null'
        editor: 'JvMTECH.Neos.ImageFocalPointEditor/ImageFocalPointEditor'
        editorOptions:
          imageProperty: 'heroImage'
```

`imageProperty` names an image property of the edited node. Prefixed with
`parent:` (`parent:image`) it reads the image of the node's parent instead.

The stored value is the same JSON string the classic editor writes, with whole
percentages of the image's width and height:

```json
{"x":57,"y":45}
```

## Using it

- **Click or drag** in the image to place the point. It is saved when the
  pointer is released.
- **Keyboard:** with the image focused, the arrow keys move the point by 1 %,
  with <kbd>Shift</kbd> by 10 %. <kbd>Enter</kbd> or leaving the field saves.
- Below the image the current position is printed as numbers.

The editor explains itself instead of staying empty when it cannot work: no
image selected yet, the node not created yet (the creation dialog), the image
failing to load, a stored value that is not a focal point, or a missing
`imageProperty` option.

## Building

The bundle is prebuilt into `Resources/Public/Plugin/`. To rebuild:

```bash
cd Resources/Private/Plugin
npm install
npm run build        # emits Resources/Public/Plugin/{plugin.js,plugin.css}
```

Then flush the Flow caches and reload `/neos/studio`. `npm run dev` rebuilds on
change.

Note: `@medienreaktor/neos-studio` (the type declarations of the Studio plugin
API) is a `file:` dependency. It is resolved **relative to this package's place
inside a Neos distribution**, and the committed path assumes the working copy
sits at `DistributionPackages/Medienreaktor.NeosStudio.ImageFocalPointEditor/`
next to an installed `Packages/Application/Medienreaktor.NeosStudio/`:

```
"@medienreaktor/neos-studio": "file:../../../../../Packages/Application/Medienreaktor.NeosStudio/Resources/Private/StudioApi"
```

Cloned anywhere else - standalone, or installed by Composer under
`Packages/Plugins/` - that path does not resolve and `npm install` fails.
Adjust it in `Resources/Private/Plugin/package.json` to wherever your Studio
package is; it is needed for types only, so a build is the only thing affected.

React, ReactDOM and the plugin API are external at runtime and resolve to the
globals the Studio shell publishes on `window`, so the plugin renders with the
shell's single React instance.

## Limitations

- `ClientEval` expressions in editor options are not evaluated (the classic
  editor does not use any either).
- There is no "remove focal point" action, as in the classic editor. The
  frontend falls back to the image's centre only while no point was ever set.
- The editor needs `Medienreaktor.NeosStudio` ≥ 1.13 for the `editors`
  registry, `useStudio` and `apiFetch`.

## License

This package is free software, released under the
[GNU General Public License, version 3 or later](LICENSE).
