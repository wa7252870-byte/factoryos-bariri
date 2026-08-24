import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#1a3a8f',
        'brand-blue-light': '#2563eb',
        'brand-gold': '#d4a017',
        'brand-gold-light': '#f5c842',
        'brand-dark': '#0a0a0a',
        'brand-surface': '#111827',
        'brand-surface-2': '#1f2937',
      },
    },
  },
  plugins: [],
}
export default config
