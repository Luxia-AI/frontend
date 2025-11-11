/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				ekster: ["Ekster Medium", "sans-serif"],
			},
			fontWeight: {
				thin: "100",
				extralight: "200",
				light: "300",
				normal: "400",
				medium: "500",
				semibold: "600",
				bold: "700",
				extrabold: "800",
				black: "900",
			},
			fontSize: {
				xs: ["0.75rem", { lineHeight: "1rem" }],
				sm: ["0.875rem", { lineHeight: "1.25rem" }],
				base: ["1rem", { lineHeight: "1.5rem" }],
				lg: ["1.125rem", { lineHeight: "1.75rem" }],
				xl: ["1.25rem", { lineHeight: "1.75rem" }],
				"2xl": ["1.5rem", { lineHeight: "2rem" }],
				"3xl": ["1.875rem", { lineHeight: "2.25rem" }],
				"4xl": ["2.25rem", { lineHeight: "2.5rem" }],
				"5xl": ["3rem", { lineHeight: "1" }],
				"6xl": ["3.75rem", { lineHeight: "1" }],
			},
			colors: {
				"luxia-green": "var(--color-luxia-green)",
				"luxia-blue": "var(--color-luxia-blue)",
				"luxia-black": "var(--color-luxia-black)",
				"luxia-white": "var(--color-luxia-white)",
				"luxia-gray-100": "var(--color-luxia-gray-100)",
				"luxia-gray-500": "var(--color-luxia-gray-500)",
				"luxia-gray-800": "var(--color-luxia-gray-800)",
				"luxia-success": "var(--color-luxia-success)",
				"luxia-warning": "var(--color-luxia-warning)",
				"luxia-error": "var(--color-luxia-error)",
				"luxia-info": "var(--color-luxia-info)",
			},
		},
	},
	plugins: [],
};
