import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const LEGACY_JS_ALIASES = [
  'app.js',
  'index-LiHLgJbH.js',
  'index-Dp2lhIMt.js',
  'index-3l1wgKtF.js',
  'index-DNYD16__.js',
  'index-BEq7BUie.js',
];

const LEGACY_CSS_ALIASES = [
  'app.css',
  'index-ajd6wndR.css',
  'index-C6VHSzS6.css',
  'index-RTlragoV.css',
  'index-BWHoBRJ-.css',
  'index-AZbCYc3R.css',
];

const now = new Date();
const buildId = String(now.getTime());
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

function mobileAutoUpdateAndAliasesPlugin(): Plugin {
  return {
    name: 'mobile-auto-update-and-aliases',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const assetsDir = path.join(distDir, 'assets');
      if (!fs.existsSync(distDir)) return;

      // 1. Copy hashed entry JS & CSS to legacy unhashed aliases so cached mobile HTML upgrades seamlessly
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const hashedJs = files.find((f) => /^app-[a-zA-Z0-9_-]+\.js$/.test(f));
        const hashedCss = files.find((f) => /^app-[a-zA-Z0-9_-]+\.css$/.test(f));

        if (hashedJs) {
          const srcJs = path.join(assetsDir, hashedJs);
          for (const alias of LEGACY_JS_ALIASES) {
            fs.copyFileSync(srcJs, path.join(assetsDir, alias));
          }
        }
        if (hashedCss) {
          const srcCss = path.join(assetsDir, hashedCss);
          for (const alias of LEGACY_CSS_ALIASES) {
            fs.copyFileSync(srcCss, path.join(assetsDir, alias));
          }
        }
      }

      // 2. Write dist/version.json polled by mobile WebViews / PWAs to auto-update without manual refresh
      fs.writeFileSync(
        path.join(distDir, 'version.json'),
        JSON.stringify({ buildId, timestamp: buildTimestamp }, null, 2),
        'utf-8'
      );

      // 3. Write dist/_headers so Render Static Sites never serve stale index.html or version.json
      const renderHeaders = [
        '/',
        '  Cache-Control: no-cache, no-store, must-revalidate',
        '/index.html',
        '  Cache-Control: no-cache, no-store, must-revalidate',
        '/version.json',
        '  Cache-Control: no-cache, no-store, must-revalidate',
        '/assets/app.js',
        '  Cache-Control: no-cache, no-store, must-revalidate',
        '/assets/app.css',
        '  Cache-Control: no-cache, no-store, must-revalidate',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(distDir, '_headers'), renderHeaders, 'utf-8');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), mobileAutoUpdateAndAliasesPlugin()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/app-[hash][extname]',
      },
    },
  },
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
