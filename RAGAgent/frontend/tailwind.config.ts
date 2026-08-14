import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eaf7ff',
          100: '#d8f0ff',
          500: '#1d7ef2',
          600: '#185ec4',
          700: '#123f8a',
          900: '#0b2347',
        },
      },
      boxShadow: {
        soft: '0 20px 50px rgba(19, 35, 70, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
