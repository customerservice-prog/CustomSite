/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/components/ConversionLeakRepairDemo.tsx',
    './src/conversion-demo-mount.tsx',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
