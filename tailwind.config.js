/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/renderer/**/*.{js,jsx,ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                neonGreen: "#89E900",
                darkGradientStart: "#222222",
                darkGradientEnd: "#1A1A1A"
            }
        },
    },
    plugins: [],
}
