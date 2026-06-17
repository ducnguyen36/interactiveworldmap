# Deploying the demo

The app is a static site (Vite). `npm run build` produces a self-contained `dist/`
folder. Vite `base` is `'./'`, so the same build works at a host root **and** under a
subpath, and the `/data/*` files are loaded relative to the page.

> The base map and layers work offline. The info panel (Wikipedia / Wikidata / flag
> lookups) needs internet at view-time.

## Option A — Quick shareable link (no Git needed)
1. `npm run build`
2. Go to **app.netlify.com/drop** and drag the `dist/` folder onto the page.
3. Share the public URL it gives you.

(Vercel and Cloudflare Pages work the same way — upload `dist/` or connect a repo.)

## Option B — GitHub Pages (auto-deploys on push)
> GitHub Pages from a **private** repo requires a paid plan (Pro/Team/Enterprise).
> On a free plan, use Option A (Netlify) — the repo can stay private.

The Pages workflow file isn't committed (pushing `.github/workflows/*` needs the `workflow`
OAuth scope). Add it one of two ways:

- **Via the GitHub web UI** (no extra scope): repo → **Actions → New workflow → set up a
  workflow yourself**, name it `deploy.yml`, paste the YAML below, commit.
- **Via git**: run `gh auth refresh -h github.com -s workflow`, then create
  `.github/workflows/deploy.yml` with the YAML below and push.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then on GitHub: **Settings → Pages → Source: GitHub Actions**. Every push to `master`
publishes to `https://<your-username>.github.io/<repo>/`.

## Local preview of the production build
```bash
npm run build
npm run preview              # http://localhost:4173
npm run preview -- --host    # also reachable from other devices on your network
```
