# rossgibson.dev

A single WebGPU page: a board of cipher characters that keeps resolving into
real code, behind an RG monogram lit from its own contour.

Three layers. At the back, a still field of characters flickering like a
split-flap display; code lines land among them one character at a time, take
their syntax colour, hold, and fly again. In the middle, a light source. In
front, the monogram in deep black, and the light escaping around its edge.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Graphics | [vgpu](https://vgpu.sh) — WebGPU, WGSL |
| Styling | Tailwind v4, Geist |

```bash
npm install
npm run dev
```

## How it renders

`src/gpu/hero/pipeline.ts` takes the **vgpu module itself** as a parameter.
`vgpu` and `vgpu/node` expose the same API, so the exact passes that run in the
browser also run headless under Node through Dawn — the preview harness is not
an approximation of the page, it is the page, rendered to a PNG.

```bash
npm run preview:hero -- --variant flare --time 34 --px 0.4 --py 0.34
npm run preview:hero -- --width 390 --height 844 --out preview/mobile.png
npm run check                # shaders, line integrity, types, lint
```

`next build` never validates WGSL — neither loader path does, so invalid
shaders ship silently. `check:shaders` is the only gate.

`verify:lines` renders the board's layout at one pixel per cell across four
viewports and eight moments, reads it back, and asserts every placed line
appears whole: starting at its first character, never restarting partway, and
running to its last. Broken lines shipped twice because a half-line still looks
like code at a glance — the check exists because looking was not enough.

### The passes

```
plate  ← the character board                    (hero-bg.wgsl)
rim    ← the mark, dilated and lit by distance  (flare-rim.wgsl)
rimA   ← gaussian H                             (flare-blur.wgsl)
rimB   ← gaussian V
canvas ← 48-step walk toward the light, graded  (flare-composite.wgsl)
```

The flare is ported from vgpu's own `nextjs-flare` example, with its constants.
The mark is not an occluder: it is the **emitter**. Its contour is dilated and
divided by distance to the source, so whichever part is nearest the light burns
brightest, and the walk gathers that light off the shape and smears it back
along the view ray. That is why the beams come off the letterforms rather than
past them.

### The board

There is no stored page. Which line sits where, and when it appears, is a hash
of the row and an epoch counter that never stops climbing, so nothing repeats
however long it is watched. The only asset is `src/gpu/font/page.ts` — the
corpus as a texture, one line per row, **sorted shortest first**. The pipeline
counts how many lines fit the current column width and the shader only indexes
below that count, which is what guarantees a line is never clipped mid-token.

Cell size scales with the viewport, so a phone gets a denser grid rather than
four enormous columns.

## The code in the artwork

`src/gpu/font/corpus.ts`. Deliberately generic — nothing is read from any
repository, so the art never changes with the work. The language mix is the
author's actual fluency and is what decides how much of the screen each one
covers: Python 37%, TypeScript 30%, Rust 19%, C 14%. A recurring motif writes
the same stream-and-index operation four ways. Sixteen lines name the author,
the handle, the domain, or Chicago.

Every line is a complete statement. A clipped line reads as broken code.

## Input

Pointer moves the light on desktop. On touch devices the **gyroscope** does —
`deviceorientation` mapped to the source position, eased because raw
orientation is noisy. iOS gates that behind a permission that can only be
requested from a gesture, so it is asked for on first touch; until then, and if
declined, the light keeps its idle drift.

`prefers-reduced-motion` composes a frame for six seconds and then holds it.

## Routes

| | |
|---|---|
| `/` | the scene, and nothing else |
| `/work` | the project list |
| `/about` | bio, stack, links |

One canvas serves all three. Routes do not tear it down and rebuild it, they
turn its presence up or down — navigating reads as the light dimming while you
read and coming back up when you return.

On `/` the navigation is not drawn until the visitor does something: moves a
pointer, touches, scrolls, or waits a couple of seconds. The first impression is
the scene alone.

Contact is two icons, not a page. A form on a personal site collects spam and
little else, and a page holding two links is a page holding two links.

## Content

`src/content/profile.ts` is the person: name, bio, stack, links.
`src/content/curation.ts` decides which repositories are featured and carries
hand-written taglines for the ones whose GitHub description undersells them.
`npm run sync` refreshes `src/data/projects.json` from the GitHub API; the
result is committed, so nothing hits the network at build or request time.
