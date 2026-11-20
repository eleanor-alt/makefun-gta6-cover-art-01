# makefun-gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/eleanor-alt/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/eleanor-alt/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Sunset Cover Studio** — a GTA-style cover art maker that runs entirely offline in a desktop browser. Load your own photos, arrange them across a multi-panel poster, pick a layout and a sunset or neon colour grade, write your caption, and export a PNG in 1080×1080, 1080×1350 or 1920×1080.

## What it does

- **Your photos, your panels** — up to three photos, one per panel, or one photo filling every panel. Click a panel to select it, drag inside it to position the photo, zoom with the slider.
- **Three poster layouts** — Split Sun (two panels), Neon Grid (three panels) and Hero Shot (one full-bleed photo).
- **Three colour grades** — Sunset, Neon Nights and Palm Noir, each washing the photos and painting the caption band in its own light.
- **Bold poster lettering** — an editable caption and tagline set in heavy system type with a thick outline, over a hand-drawn retro sun and palm silhouettes.
- **Real exports** — the cover is rendered at full resolution on a canvas and downloaded as a PNG in the post size you picked.
- **Fully offline** — static files under `app/`, no build step, no libraries, no network requests; photos are read on your machine and never uploaded. No game logos, artwork or fonts are used.

## Try it

```sh
node serve.ts   # serves app/ on http://localhost:8080
```

Open the page, load a photo (or try the sample), pick a layout and grade, type a caption, and hit **Export PNG**.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/ with app/, screenshots/ and dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mfztwn6d&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
