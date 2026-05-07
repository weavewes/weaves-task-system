/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f7f4ed',
        'text-primary': '#1c1c1c',
        'text-secondary': '#5f5f5d',
        'border-passive': '#eceae4',
        'border-interactive': 'rgba(28,28,28,0.4)',
      },
      fontFamily: {
        sans: ['Camera Plain Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        focus: 'rgba(0,0,0,0.1) 0px 4px 12px',
      },
    },
  },
  plugins: [],
}
