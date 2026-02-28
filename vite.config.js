import { defineConfig, mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
var viteConfig = defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            // includeAssets removed: globPatterns '**/*.{ico,png,svg}' already covers these files.
            // Having both caused duplicate entries in the precache manifest, wasting bandwidth on mobile.
            manifest: {
                name: 'Inventory App',
                short_name: 'Inventory',
                description: 'Mobile-first inventory management application',
                theme_color: '#3b82f6',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-192x192-maskable.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                cleanupOutdatedCaches: true,
                navigateFallbackDenylist: [/^\/auth/],
                runtimeCaching: [
                    {
                        // Auth endpoints must NEVER be cached — stale tokens cause silent auth failures.
                        urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
                        handler: 'NetworkOnly',
                    },
                    {
                        // Only cache REST API data calls — auth endpoints (/auth/v1/*) are excluded
                        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'supabase-data-cache',
                            // Fall back to cache after 10 s — prevents indefinite hangs on slow Android networks
                            networkTimeoutSeconds: 10,
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 2 // 2 hours (reduced from 24h to limit stale data after Wi-Fi→mobile transition)
                            },
                            cacheableResponse: {
                                statuses: [200]
                            }
                        }
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        target: 'esnext',
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: {
                    'supabase': ['@supabase/supabase-js']
                }
            }
        }
    }
});
var testConfig = {
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true
    }
};
export default mergeConfig(viteConfig, testConfig);
