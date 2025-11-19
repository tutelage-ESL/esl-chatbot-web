/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.html",
    "./public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        background: 'white',
        foreground: 'black',
        primary: '#f59e0b',
        accent: '#fec016',
        secondary: '#111111',
        muted: '#f2f2f2',
        'muted-foreground': '#4a4a50',
        border: 'light neutral',
        input: 'light neutral',
        ring: 'neutral',
        'primary-foreground': 'white', // Assuming primary text is white on primary background
      },
      borderRadius: {
        lg: '0.625rem',
      },
    },
  },
  plugins: [],
}