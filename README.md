# rossgibson.dev

A personal site whose background is a live WebGPU simulation of its own contents.

Every project on the site is a **body** in a particle field: its mass is its star
count, its colour is its primary language, and its position is fixed on a
phyllotaxis spiral. Particles are thrown off one body, carried by a
divergence-free curl-noise flow, and captured by another — so the luminous
filaments between projects are literal, and they gradient from the colour of the
project that emitted them to the colour of the one pulling them in.

The field is one canvas that lives for the whole session. Routes don't reload it;
they change the scene it eases toward, so navigating reads as the camera moving.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Graphics | [vgpu](https://vgpu.sh) — WebGPU, WGSL compute + render |
| Styling | Tailwind v4, Geist Sans / Geist Mono |
| Data | GitHub REST, synced to committed JSON |

## Running it

```bash
npm install
npm run dev
```

## How the graphics are built

`src/gpu/pipeline.ts` takes the **vgpu module itself** as a parameter. `vgpu` and
`vgpu/node` expose the same API, so the exact passes, shaders and uniforms that
run in the browser also run headless under Node through Dawn. That is what makes
the preview harness meaningful — it is not an approximation of the site, it is
the site, rendered to a PNG.

```bash
# Render any scene headless and look at it
npm run preview -- --scene field --steps 900 --out preview/field.png
npm run preview -- --scene constellation --width 1440 --height 900

# Sweep a single dial without editing code
npm run preview -- --scene field --flow 0.5 --gravity 0.08 --decay 0.9
```

Two things about this are worth knowing:

- **Tune against the settled image, not the transient.** The field takes roughly
  700 frames to reach equilibrium and keeps getting brighter on the way there.
  Anything tuned at 300 steps will be overexposed once it settles, so pass
  `--steps 900`.
- **`next build` never validates WGSL.** Neither loader path does — invalid
  shaders ship silently. `npm run check:shaders` compiles every `.wgsl` against a
  real device and prints only the failures. Run it before trusting a shader.

### The passes

```
compute: advect particles (ping-pong storage)
   ↓
scene   ← decay pass (accumulation) + particles (additive) + bodies (additive)
   ↓        the accumulation buffer is what turns moving points into filaments
bright  ← luminance threshold, clamped
   ↓
near    ← gaussian H, V                 (½ resolution)
far     ← gaussian H, V from near       (⅕ of that)
   ↓
canvas  ← composite: ACES, vignette, aberration, grain
```

`src/gpu/shaders/` holds the WGSL. `simulate.wgsl` carries most of the ideas
worth reading — particularly why curl is used as a *velocity* field rather than a
force, and why swirl has to fall off exponentially.

## How the content is built

```bash
npm run sync     # GitHub → src/data/projects.json
npm run poster   # regenerate the no-WebGPU fallback image
```

`src/content/curation.ts` is the editorial layer: which projects are featured, in
what order, which are hidden, and hand-written taglines and blurbs for the ones
whose GitHub description undersells them. READMEs are stripped of badges, HTML
and code fences at sync time into a clean summary plus highlights, so no raw
markdown is ever rendered.

`src/content/profile.ts` holds everything about the person — name, bio, stack,
links. Edit there, not in components.

**Only public repositories are synced.** Several private repos are deliberately
absent; make one public and it appears on the next `npm run sync`.

## Fallbacks

- **No WebGPU** — the page falls back to `public/field-poster.jpg`, which is a
  settled frame of the same simulation rendered by `npm run poster`. The fallback
  is the real artwork, not a mockup.
- **`prefers-reduced-motion`** — the field runs for six seconds to compose
  itself, then freezes on that frame. Pointer stirring is not attached at all.
- **Narrow viewports** — the constellation labels are desktop-only; the list
  below is the navigation there.

## Deploying

Vercel, zero config. The build is fully static: 16 project pages are
pre-rendered from the committed JSON, so nothing hits the GitHub API at build or
request time.
