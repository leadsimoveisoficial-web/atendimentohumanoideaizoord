// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { liveVoiceDev } from "./live-vite-plugin";

// The devtools source injector adds `data-tsd-source` to every JSX element, including
// three.js elements, which react-three-fiber rejects. Strip it from 3D scene files.
const stripTsdSourceFor3D = {
  name: "strip-tsd-source-r3f",
  enforce: "post" as const,
  transform(code: string, id: string) {
    if (!/\.[jt]sx(\?|$)/.test(id) || !code.includes("data-tsd-source") || !code.includes("@react-three")) return;
    return {
      code: code.replace(/["']data-tsd-source["']\s*:\s*["'][^"']*["']\s*,?/g, "").replace(/\sdata-tsd-source="[^"]*"/g, ""),
      map: null,
    };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: { plugins: [stripTsdSourceFor3D, liveVoiceDev()] },
});
