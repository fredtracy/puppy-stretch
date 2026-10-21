import { defineConfig } from 'vite';

export default defineConfig({
  base: '/puppy-stretch/',
  server: {
    // Fixed and reserved, one up from puppy-run's 7331, so the two can run
    // side by side. strictPort so it fails loudly instead of drifting.
    port: 7332,
    strictPort: true,
  },
});
