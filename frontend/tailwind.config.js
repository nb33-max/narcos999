/** @type {import('tailwindcss').Config} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{js,jsx}')],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F6F2',
        card: '#FFFFFF',
        subcard: '#F3F0EA',
        pine: '#3E4A3E',
        pinedark: '#1E2620',
        moss: '#687268',
        mossdark: '#4A554A',
        crimson: '#8B0000',
        crimsondark: '#6B0000',
        stone: '#E5E0D8',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(62, 74, 62, 0.08)',
        lift: '0 12px 32px rgba(62, 74, 62, 0.14)',
      },
    },
  },
  plugins: [],
};
