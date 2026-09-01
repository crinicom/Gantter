/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          todo: '#e8e8e8',
          'in-progress': '#6200ea',
          completed: '#107c10',
          critical: '#e03131',
        },
      },
    },
  },
  plugins: [],
};
