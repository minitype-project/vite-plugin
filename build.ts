import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { type BuildOptions, build, context, type Plugin } from "esbuild";

const isWatch = process.argv.includes("--watch");

/**
 * ファイルをコピーするプラグイン
 * @param src コピー元ファイルのパス
 * @param dest コピー先ファイルのパス
 */
const copyFilePlugin = (src: string, dest: string): Plugin => ({
  name: "copy-file-plugin",
  setup(inBuild) {
    inBuild.onEnd(() => {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    });
  },
});

// プレビュー用 Web アプリケーション
const previewOptions: BuildOptions = {
  entryPoints: ["./src/preview-app/index.tsx"],
  outfile: "./dist/preview-app/index.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: !isWatch,
  jsx: "automatic",
  jsxImportSource: "react",
  plugins: [
    copyFilePlugin(
      "./src/preview-app/index.html",
      "./dist/preview-app/index.html",
    ),
  ],
};

// プラグイン本体
const pluginOptions: BuildOptions = {
  entryPoints: ["./src/index.ts"],
  outfile: "./dist/index.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  external: ["vite", "@minitype/minitype"],
  sourcemap: true,
  minify: false,
};

const options = [previewOptions, pluginOptions];

if (isWatch) {
  const contexts = await Promise.all(options.map(context));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching for changes...");
} else {
  await Promise.all(options.map((option) => build(option)));
}
