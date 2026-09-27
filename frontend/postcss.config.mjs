/**
 * postcss.config.mjs
 * ------------------
 * Tailwind CSS v4 uses @tailwindcss/postcss instead of the old
 * `tailwindcss` PostCSS plugin. No tailwind.config.js needed —
 * everything is configured via CSS @theme directives in globals.css.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
