# Abdul Halim Vacation Homes: sample website

Static multi-page site built with Astro 7, Tailwind CSS 4, GSAP and Lenis. It is a sample for approval: every page is `noindex, nofollow` and `robots.txt` disallows crawling.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` at http://localhost:4321 (or pass `--port`) |
| `npm test` | Unit tests plus acceptance checks on `dist/` (run `npm run build` first) |
| `npm run test:e2e` | Playwright E2E and axe accessibility tests (expects `astro preview --port 4322`) |

## Where things live

- **Copy**: one JSON file per page in `src/content/` (`home.json`, `about.json` and so on), plus `site.json` for navigation, offices, licences, entities and footer. Edit text there; no layout code needs to change. This is also the hand-off point for the Arabic version.
- **Placeholders**: write pending facts in square brackets, for example `[Licence No.]`. They render as highlighted chips automatically.
- **Turn placeholder highlighting off**: set `"showPlaceholders": false` in `src/content/site.json`. That removes the single `ph-on` class from `<html>`.
- **Inline links in copy**: `[Standards & Compliance](/standards/)`.
- **Design tokens**: `src/styles/global.css` (`@theme` block). Components use tokens only.
- **Images**: originals stay untouched in `assets/images/`. The build creates responsive WebP versions and never upscales. The unattributed deck portrait was confirmed as Mr. Abdul Halim Samad Mollah and copied to `team-abdul-halim-samad-mollah.png`; the original `leadership-portrait.png` stays excluded.
- **Ornaments**: `src/assets/ornaments/` (8-point star, girih tile and mashrabiya lattice), generated geometrically.

## Development-only stress toggle

With `npm run dev`, a small control at the bottom of every page switches between **Demo data** and **Worst case** (placeholders filled with long, realistic values), plus **RTL** and **Text 200%**. The fixture is `src/dev/worst-case.json`. It is never included in the production build.

## Before launch

- Replace every bracketed placeholder in `src/content/`.
- Confirm the WhatsApp number and map locations (the maps search by building address).
- Supply `corporate-profile.pdf`, then turn the disabled download button into a real link in `src/pages/partner-with-us.astro`.
- Connect the enquiry form to a real endpoint (it currently validates and confirms only, and sends nothing).
- Remove `noindex` and update `public/robots.txt`.
