import { defineConfig } from 'vite';
import tailwindcss from "tailwindcss";

export default defineConfig({
  base: '/dev',
  server: {
    host: true,
    port: 8081,
  },
  css: {
    postcss: {
     plugins: [tailwindcss()],
    },
   },
})