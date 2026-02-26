/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d9',
          300: '#f4a9b8',
          400: '#ec7a93',
          500: '#e94560',
          600: '#d42a4c',
          700: '#b21e3e',
          800: '#951c38',
          900: '#7f1b34',
        },
        navy: {
          50: '#f0f3f8',
          100: '#dde4f0',
          200: '#c2cfe4',
          300: '#99b0d2',
          400: '#6a89bb',
          500: '#4a6da4',
          600: '#3a578a',
          700: '#314871',
          800: '#2c3e5e',
          900: '#1a1a2e',
          950: '#111127',
        },
      },
    },
  },
  plugins: [],
};
