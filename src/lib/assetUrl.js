// Absolute URL for a public asset, resolved against Vite's base. Works at a host root,
// under a subpath, and with the relative './' base used for GitHub Pages. MapLibre style
// URLs (glyphs, source data) must be absolute, hence this helper.
export function assetUrl(path) {
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  return base + path.replace(/^\//, '');
}
