import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://madhatterstudio.co.uk',
  output: 'static',
  build: { format: 'directory' },
});
