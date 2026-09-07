/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta §14: papel cálido, tinta y acento único bosque.
        paper: '#efeae2',
        surface: '#f7f3ec',
        ink: '#1a1814',
        muted: '#6f6a62',
        rust: '#7d5247',
        critical: '#a33a32',
        forest: {
          50: '#eef2ef',
          100: '#dce6e0',
          200: '#b9cdc3',
          300: '#90b1a2',
          400: '#608d7a',
          500: '#42705f',
          600: '#2b4d42',
          700: '#23403a',
          800: '#1a312d',
          900: '#12211e',
        },
        status: {
          todo: '#e8e8e8',
          'in-progress': '#2b4d42',
          completed: '#107c10',
          critical: '#a33a32',
        },
      },
      fontFamily: {
        // §14: display serif humana para nombres/títulos, sans para UI. Máximo 2 familias.
        display: ["'Fraunces'", 'Georgia', 'serif'],
        sans: ["'Figtree'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
