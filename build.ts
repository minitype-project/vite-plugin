import { copyFileSync } from "node:fs";
import { build } from "esbuild";

await Promise.all([
  // プレビュー用 Web アプリケーション
  build({
    entryPoints: ["./src/preview-app/index.tsx"],
    outfile: "./dist/preview-app/index.js",
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: true,
    jsx: "automatic",
    jsxImportSource: "react",
  }),

  // プラグイン本体
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
  }),
]);

copyFileSync("./src/preview-app/index.html", "./dist/preview-app/index.html");
