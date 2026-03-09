/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#4F46E5',
                    50: '#ECEAFD',
                    100: '#D9D5FB',
                    200: '#B3ABF7',
                    300: '#8D80F3',
                    400: '#6756EF',
                    500: '#4F46E5',
                    600: '#3730A3',
                    700: '#2E2883',
                    800: '#241F62',
                    900: '#1B1742',
                }
            },
            animation: {
                'in': 'fadeIn 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [],
}
