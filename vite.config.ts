import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const LEGACY_JS_ALIASES = [
  'index-LiHLgJbH.js',
  'index-Dp2lhIMt.js',
  'index-3l1wgKtF.js',
  'index-DNYD16__.js',
  'index-BEq7BUie.js',
];

const LEGACY_CSS_ALIASES = [
  'index-ajd6wndR.css',
  'index-C6VHSzS6.css',
  'index-RTlragoV.css',
  'index-BWHoBRJ-.css',
  'index-AZbCYc3R.css',
];

function keepLegacyAssetAliases(): Plugin {
  return {
    name: 'keep-legacy-asset-aliases',
    closeBundle() {
      const assetsDir = path.resolve(__dirname, 'dist/assets');
      const mainJs = path.join(assetsDir, 'app.js');
      const mainCss = path.join(assetsDir, 'app.css');
      if (fs.existsSync(mainJs)) {
        for (const alias of LEGACY_JS_ALIASES) {
          fs.copyFileSync(mainJs, path.join(assetsDir, alias));
        }
      }
      if (fs.existsSync(mainCss)) {
        for (const alias of LEGACY_CSS_ALIASES) {
          fs.copyFileSync(mainCss, path.join(assetsDir, alias));
        }
      }
    },
  };
}

const now = new Date();
const timeStr = now.toLocaleTimeString('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const dateStr = now.toLocaleDateString('en-US', {
  timeZone: 'America/New_York',
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});
const buildTimestamp = `${timeStr} - ${dateStr}`;

export default defineConfig({
  base: './',
  plugins: [react(), keepLegacyAssetAliases()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/chunk-[name].js',
        assetFileNames: 'assets/app[extname]',
      },
    },
  },
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },
});
