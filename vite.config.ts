import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The demo is the green and white look (src/main-green.tsx), published at the main address:
 *   npm run build:site    green and white -> dist/            -> /NADLANIL-DEMO/        (what is deployed)
 *   npm run dev:green     green, locally  -> /NADLANIL-DEMO/green/ on port 5240          (what the checks use)
 * The navy and gold look is no longer published (Itzik, 12.11.2026). Its entry is still in the repo for the old
 * local scripts, and builds with `npm run build`, but nothing deploys it.
 */
function themeHtml(green: boolean, base: string): Plugin {
  const pick = (a: string, b: string) => (green ? b : a)
  const map: Record<string, string> = {
    '%ENTRY%': pick('/src/main.tsx', '/src/main-green.tsx'),
    '%FAVICON%': pick('favicon.png', 'favicon-green.png'),
    '%APPLE_ICON%': pick('apple-touch-icon.png', 'apple-touch-icon-green.png'),
    '%THEME_COLOR%': pick('#0A0F20', '#0B6B49'),
    '%TITLE%': pick('הדבר הבא בעולם המתווכים - דמו', 'NadlanUP | המתווכים החופשיים - דמו'),
    '%OG_TITLE%': pick('הדבר הבא בעולם המתווכים', 'NadlanUP | המתווכים החופשיים'),
    '%OG_IMAGE%': pick('https://isru-digital.github.io/NADLANIL-DEMO/og.jpg', `https://isru-digital.github.io${base}og-green.jpg`),
  }
  return {
    name: 'theme-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => Object.entries(map).reduce((h, [k, v]) => h.split(k).join(v), html),
    },
  }
}

// base is relative to the GitHub Pages project path; override with VITE_BASE if the host changes.
export default defineConfig(({ mode }) => {
  const site = mode === 'site'
  const green = mode === 'green' || site
  const base = process.env.VITE_BASE ?? (site ? '/NADLANIL-DEMO/' : green ? '/NADLANIL-DEMO/green/' : '/NADLANIL-DEMO/')
  return {
    base,
    define: { __THEME__: JSON.stringify(green ? 'green' : 'navy') },
    build: { outDir: site ? 'dist' : green ? 'dist/green' : 'dist' },
    plugins: [react(), themeHtml(green, base)],
  }
})
