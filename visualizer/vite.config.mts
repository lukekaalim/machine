import { defineConfig } from 'npm:vite@3.2.4';
import denoResolve from "https://deno.land/x/vite_plugin_deno_resolve@0.5.0/mod.ts";

export default defineConfig({
  plugins: [denoResolve()],
});