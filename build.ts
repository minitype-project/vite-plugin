import { build } from "esbuild";

build({
  entryPoints: ["./src/index.ts"],
  outfile: "./dist/index.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  external: ["vite", "minitype"],
  sourcemap: true,
  minify: false,
});
