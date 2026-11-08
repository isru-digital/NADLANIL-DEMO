import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Two looks of the same demo, built from one codebase:
 *   npm run build         navy and gold   -> dist/            -> /NADLANIL-DEMO/
 *   npm run build:green   green and white -> dist/green/      -> /NADLANIL-DEMO/green/
 * The green build has its own entry (src/main-green.tsx) and favicon; everything else is shared.
 */
function themeHtml(green: boolean): Plugin {
  const pick = (a: string, b: string) => (green ? b : a)
  const map: Record<string, string> = {
    '%ENTRY%': pick('/src/main.tsx', '/src/main-green.tsx'),
    '%FAVICON%': pick('favicon.png', 'favicon-green.png'),
    '%APPLE_ICON%': pick('apple-touch-icon.png', 'apple-touch-icon-green.png'),
    '%THEME_COLOR%': pick('#0A0F20', '#0B6B49'),
    '%OG_IMAGE%': pick('https://isru-digital.github.io/NADLANIL-DEMO/og.jpg', 'https://isru-digital.github.io/NADLANIL-DEMO/green/og-green.jpg'),
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
  const green = mode === 'green'
  return {
    base: process.env.VITE_BASE ?? (green ? '/NADLANIL-DEMO/green/' : '/NADLANIL-DEMO/'),
    define: { __THEME__: JSON.stringify(green ? 'green' : 'navy') },
    build: { outDir: green ? 'dist/green' : 'dist' },
    plugins: [react(), themeHtml(green)],
  }
})
