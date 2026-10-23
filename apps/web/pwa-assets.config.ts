import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PWA / Apple touch icons from the favicon.
// Run `npm run generate-pwa-assets` after changing public/favicon.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#000000' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#000000' } },
  },
  images: ['public/favicon.svg'],
})
