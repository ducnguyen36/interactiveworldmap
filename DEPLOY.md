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

## Option B — GitHub Pages (free, auto-deploys on push)
A workflow is included at `.github/workflows/deploy.yml`. One-time setup:

1. Create a GitHub repo and push `master`:
   ```bash
   gh repo create interactiveworldmap --public --source=. --push
   # or, with an existing empty repo:
   # git remote add origin https://github.com/<you>/<repo>.git
   # git push -u origin master
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `master` builds and publishes to:
   `https://<your-username>.github.io/<repo>/`
   (The first deploy also runs automatically after you enable Pages; you can also
   trigger it from the **Actions** tab via "Run workflow".)

## Local preview of the production build
```bash
npm run build
npm run preview              # http://localhost:4173
npm run preview -- --host    # also reachable from other devices on your network
```
