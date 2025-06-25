/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'lovable-primary': '#6D28D9',
          'lovable-secondary': '#8B5CF6',
          'lovable-bg': '#F5F3FF',
          'lovable-card': '#EDE9FE',
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
      },
    },
    plugins: [],
  };
 