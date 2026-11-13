import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://madhatter.studio',
  output: 'static',
  build: { format: 'directory' },
});
