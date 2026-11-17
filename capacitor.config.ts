import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.jaro0121.learngram',
  appName: 'LearnGram',
  webDir: 'dist',
  backgroundColor: '#0b0b12',
  plugins: {
    // Dark app → light status-bar icons; content is laid out edge-to-edge with safe-area padding.
    SystemBars: { style: 'DARK', insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
  android: {
    // Live content is fetched over HTTPS only.
    allowMixedContent: false,
  },
};

export default config;
