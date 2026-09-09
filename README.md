# Personal site

My personal site. One WebGPU canvas sits behind every page: a field of cipher
characters that keeps resolving into real code, with an RG monogram lit from its
own contour.

## Routes

| | |
|---|---|
| `/` | the scene, and nothing else |
| `/work` | where I have worked |
| `/projects` | side projects, with star counts read live from GitHub |
| `/about` | bio, education, tools |

One canvas serves all four. Navigating turns its presence up or down rather than
tearing it down and rebuilding it.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Graphics | WebGPU and WGSL through [vgpu](https://vgpu.sh), by Vercel Labs |
| Styling | Tailwind v4, Geist |

```bash
npm install
npm run dev
npm run check   # shaders, line integrity, types, lint
```

## How the scene works

**The monogram is the emitter, not an occluder.** Its contour is dilated and
divided by distance to the light, so whichever part sits nearest burns
brightest. That is why the beams come off the letterforms rather than past them.

**Nothing is stored.** Which code line lands where, and when, is a hash of the
row and an epoch counter that never stops climbing, so the board never repeats
however long you watch it.

**A line can never be clipped mid-token.** The corpus is sorted shortest first,
and the shader only indexes below the number of lines that fit the current
column width. Clipped code reads as broken code.

**The headless preview is the page, not a picture of it.** `createHeroPipeline`
takes the vgpu module itself as an argument. `vgpu` and `vgpu/node` expose the
same API, so the passes that run in a browser also run under Node through Dawn.

That is what makes the board testable: `npm run verify:lines` renders the layout
at one pixel per cell across nine viewports and eight moments, reads the pixels
back, and asserts every placed line appears whole — 5,412 line runs a pass.
Worth having, because `next build` never validates WGSL. An invalid shader would
ship silently, so `check:shaders` is the only gate.
