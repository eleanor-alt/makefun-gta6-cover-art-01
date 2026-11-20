// Vice Sunset Cover Studio — the hand-in program for gta6-cover-art-01.
// Node 22, standard library only. It takes this repository's app/ (the
// static cover maker: index.html, style.css and src/app.js, plus the two
// sample photos under app/samples/) and screenshots/ and lays them out in
// /output, then writes /output/dossier.json with the kit's buildDossier so
// the judge can read the entry. Nothing here needs the network: the program
// only copies files that are already in this repository, and it refuses to
// write a dossier for an incomplete copy — the entrypoint and at least one
// screenshot must be present, or the run fails loudly instead of handing
// in a broken entry.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The files a valid entry cannot do without. Checked before anything is
// copied, so a half-built checkout fails here instead of at the gate.
const required = ['app/index.html', 'app/src/app.js', 'app/style.css'];
for (const rel of required) {
  if (!existsSync(join(repoRoot, rel))) throw new Error(`missing required file: ${rel}`);
}
const shotFiles = existsSync(join(repoRoot, 'screenshots'))
  ? readdirSync(join(repoRoot, 'screenshots')).filter((f) => !f.startsWith('.'))
  : [];
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

// The caps the gate enforces: at most 4 screenshots of 256 KiB each, app/
// under 993 files and 48 MiB with no path over 1000 bytes, and the dossier
// text capped at 160 KiB. The dossier is built from what was just copied,
// so it always describes the exact files being handed in.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
console.log(
  `handed in ${shotFiles.length} screenshots and dossier.json (${dossierBytes} bytes) to ${outputDir}`,
);
