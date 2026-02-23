/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "class",
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {},
	},
	safelist: [
  		{
			pattern: /(text|border)-(red|orange|amber|blue|emerald|indigo|purple)-(400|500|600|700|800|900)/,
			variants: ["group-hover", "dark", "dark:group-hover"],
  		},
	],

	plugins: [require("@tailwindcss/typography")],
};
