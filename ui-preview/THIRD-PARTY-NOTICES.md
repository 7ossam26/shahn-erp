# Third-party notices

## SmoothUI Smooth Button

Vendored on 2026-10-03 for the local design prototype. No rendering, runtime, accessibility, or application integration test is claimed by this vendoring record.

- Component: `src/components/smooth-ui/smooth-button.tsx`
- Official registry source: https://smoothui.dev/r/smooth-button.json
- Official documentation: https://smoothui.dev/docs/components/smooth-button
- Upstream license: https://raw.githubusercontent.com/educlopez/smoothui/main/LICENSE
- Registry response SHA-256: `11fff8f8a01679902171d4baff086982954301c1fccaefe8ddca845dea115fad`
- Unmodified component source SHA-256 (UTF-8, extracted `files[].content` for `index.tsx`): `956a42a8a959564573c14fc875943c010de4fef52a5de458b07ef6b10021f69b`
- Adapted component source SHA-256 (UTF-8): `b8dcd16b09f85faa8fd7351cb120b07aece1cb05de2a93c6691ff36c718e9456`
- License response SHA-256: `9877f4310c0549e5ce26affe52ba97c4e60325472bdcdd308a92fccd90f119cc`

The public registry URL is mutable. These hashes identify the bytes reviewed and used; no Git commit identity is inferred from them.

### Local adaptations

1. Replace loading-indicator `marginRight` with logical `marginInlineEnd` so spacing follows RTL direction.
2. Add `motion-reduce:animate-none` to the loading spinner.
3. Add `min-h-11` to the shared button classes, enforcing a 44px minimum height while retaining the existing size variants and public props.

The upstream component's exports, variants, properties and normal behavior remain otherwise unchanged. It still imports `@/lib/utils`, `@radix-ui/react-slot`, `class-variance-authority`, `motion/react` and React. The registry also references `https://smoothui.dev/r/tokens.json`; token integration is a separate setup concern. This manual vendoring step does not install that registry item or select a global theme.

### MIT License

MIT License

Copyright (c) 2024 Eduardo Calvo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Other bundled UI sources

The generated shadcn/ui button, input, badge and dialog use the upstream MIT license retained in licenses/shadcn-ui.txt (Copyright 2023 shadcn). Source: https://github.com/shadcn-ui/ui. Local adaptations connect cn to the shared utility and translate the dialog close label for Arabic.

The Cairo font is supplied by @fontsource-variable/cairo. Its font license is retained in licenses/cairo-font.txt. Other package licenses remain available in their installed packages.
