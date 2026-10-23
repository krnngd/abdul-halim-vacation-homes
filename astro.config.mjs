import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the site from /<repo>/; the deploy workflow sets these.
const base = process.env.BASE_PATH ?? '/';
const site = process.env.SITE_URL;

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  // 'class' lets a scoped class passed to a child component keep its styles.
  scopedStyleStrategy: 'class',
  build: {
    format: 'directory',
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
