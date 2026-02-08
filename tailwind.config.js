/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            borderRadius: {
                xl: "0.75rem",
                "2xl": "1rem",
            },
            colors: {
                background: "#0b0d0e",
                surface: "#161819",
            }
        },
    },
    plugins: [],
}
