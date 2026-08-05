import { readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";

import { MINITYPE_PACKAGE, runBuildHandler } from "./build-handler.js";
import { generateServerWrapperCode } from "./server-wrapper.js";

// SSR コンテキストで `minitype` インポートを差し替えるラッパーモジュール
const SERVER_WRAPPER = "\0minitype-server-wrapper";
// ビルドモード時に Vite のデフォルトエントリ（index.html）要求を回避するダミーエントリ
const DUMMY_ENTRY = "\0minitype-entry";

const distDir = path.dirname(fileURLToPath(import.meta.url));
const htmlTemplate = readFileSync(
  path.join(distDir, "preview-app/index.html"),
  "utf-8",
);

/** ファイル監視対象のデフォルト拡張子（.ts を除く）． */
const deafultWatchExtensions = [
  "md",
  "webp",
  "jpeg",
  "jpg",
  "png",
  "gif",
  "pdf",
];

/**
 * `@minitype/vite-plugin` のオプション．
 */
export interface MinitypePluginOptions {
  /**
   * 組版エントリファイルの相対パス．
   * @default 'index.ts'
   */
  entry?: string;
  /**
   * ファイル変更時に再組版をトリガーする拡張子のリスト（`.ts` を除く）．
   * @default ["md", "webp", "jpeg", "jpg", "png", "gif", "pdf"]
   */
  watchExtensions?: string[];
}

/**
 * SSR コンテキストでの `@minitype/minitype` インポートをラッパーモジュールに差し替える．
 */
const resolveMinitypeId = (
  id: string,
  importer: string | undefined,
  ssr: boolean,
): string | undefined => {
  if (id === SERVER_WRAPPER) {
    return SERVER_WRAPPER;
  }

  // SSR コンテキストでのみ差し替え
  // SERVER_WRAPPER 自身がインポートする際はスキップ（再帰を防ぐ）
  if (id === MINITYPE_PACKAGE && ssr && importer !== SERVER_WRAPPER) {
    return SERVER_WRAPPER;
  }
};

/**
 * 差し替え先のモジュールコードを返す．
 */
const loadMinitypeModule = (id: string): string | undefined => {
  if (id === SERVER_WRAPPER) {
    return generateServerWrapperCode();
  }
};

/**
 * minitype の Vite プラグインを生成する．
 *
 * 本プラグインは以下の機能を提供する．
 * - Vite 開発サーバ（Node.js）上で組版処理を実行する．ファイルの変更を検知して再度組版する．
 * - SSE を用いて組版の状態をクライアントに通知する．
 * - ブラウザ上でのプレビュー機能を提供する．
 * - `vite build` 実行時に組版結果の PDF をディスクに書き出す．
 */
export const minitypePlugin = (options: MinitypePluginOptions = {}): Plugin => {
  let projectRoot: string;
  let resolvedConfig!: ResolvedConfig;

  // ------
  // SSE クライアント管理
  // ------
  const sseClients = new Set<ServerResponse>();
  let currentPdf: Buffer | null = null;
  let isRunning = false;
  /** 生成された PDF のパス． */
  const generatedPdfPaths = new Set<string>();

  /**
   * SSE でクライアントにイベントを送信する．
   */
  const sendToClients = (event: string, data: string) => {
    for (const res of sseClients) {
      res.write(`event: ${event}\ndata: ${data}\n\n`);
    }
  };

  /**
   * サーバラッパーから呼び出されるコールバックを `globalThis` に登録する．
   * `ssrLoadModule` の実行コンテキストと同一プロセスであるため，
   * `globalThis` 経由で結果を受け取れる．
   */
  const setupGlobals = () => {
    (globalThis as any).__minitypeSendResult = (
      pdf: Uint8Array,
      outputPath?: string,
    ) => {
      if (outputPath) {
        generatedPdfPaths.add(outputPath);
        writeFileSync(outputPath, Buffer.from(pdf));
      }
      currentPdf = Buffer.from(pdf);
      sendToClients("updated", "");
    };

    (globalThis as any).__minitypeSendImages = (
      images: Uint8Array[],
      basePath: string,
      previewPdf: Uint8Array,
    ) => {
      const base = basePath.replace(/\.png$/i, "");
      for (let i = 0; i < images.length; i++) {
        const outPath = images.length === 1 ? basePath : `${base}-${i}.png`;
        generatedPdfPaths.add(outPath);
        writeFileSync(outPath, Buffer.from(images[i]));
      }
      currentPdf = Buffer.from(previewPdf);
      sendToClients("updated", "");
    };

    (globalThis as any).__minitypeSendError = (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      sendToClients("minitype-error", JSON.stringify({ message }));
    };
  };

  /**
   * 組版エントリを `ssrLoadModule` で実行する．
   */
  const runEntry = async (server: ViteDevServer) => {
    if (isRunning) {
      return;
    }
    isRunning = true;
    // 再組版開始をブラウザに通知してローディング状態に戻す
    sendToClients("restarted", "");
    try {
      // node_modules 以外のモジュールキャッシュを消去して，ソースの最新状態が反映されるようにする．
      // node_modules は再実行しないことにより，フォントのインメモリキャッシュを再組版時にも保持する．
      for (const [, mod] of server.moduleGraph.idToModuleMap) {
        if (mod.id && !mod.id.includes("/node_modules/")) {
          server.moduleGraph.invalidateModule(mod);
        }
      }

      const rawEntry = options.entry ?? "index.ts";
      const entryUrl = rawEntry.startsWith("/") ? rawEntry : `/${rawEntry}`;
      await server.ssrLoadModule(entryUrl);
    } catch (error) {
      (globalThis as any).__minitypeSendError?.(error);
    } finally {
      isRunning = false;
    }
  };

  return {
    name: "minitype",
    enforce: "pre",

    config(_, { command }) {
      const base = {
        ssr: {
          noExternal: [MINITYPE_PACKAGE],
        },
      };
      if (command !== "build") {
        return base;
      }
      return {
        ...base,
        build: {
          rollupOptions: {
            input: DUMMY_ENTRY,
          },
        },
      };
    },

    configResolved(config: ResolvedConfig) {
      projectRoot = config.root;
      resolvedConfig = config;
    },

    resolveId(
      id: string,
      importer: string | undefined,
      resolveOptions: { ssr?: boolean },
    ) {
      if (id === DUMMY_ENTRY) {
        return DUMMY_ENTRY;
      }
      return resolveMinitypeId(id, importer, resolveOptions.ssr ?? false);
    },

    load(id: string) {
      if (id === DUMMY_ENTRY) {
        return "";
      }
      return loadMinitypeModule(id);
    },

    // 開発サーバのセットアップ
    configureServer(server: ViteDevServer) {
      setupGlobals();

      // ビルド済みのブラウザアプリとワーカーをサーバ起動時に一度読み込む
      const previewAppJs = readFileSync(
        path.join(distDir, "preview-app/index.js"),
      );
      const require = createRequire(import.meta.url);
      const workerJs = readFileSync(
        require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"),
      );

      // ファイルを Vite のファイル監視に追加
      const extensions = options.watchExtensions ?? deafultWatchExtensions;
      server.watcher.add(
        path.join(projectRoot, `**/*.{${extensions.join(",")}}`),
      );

      // 監視対象ファイル変更時の再実行
      server.watcher.on("change", (file) => {
        if (
          !generatedPdfPaths.has(file) &&
          extensions.some((ext) => file.endsWith(`.${ext}`))
        ) {
          runEntry(server);
        }
      });

      // GET /__minitype/stream
      // ブラウザがこのエンドポイントに接続し，組版完了通知を待ち受ける
      server.middlewares.use(
        "/__minitype/stream",
        (req: IncomingMessage, res: ServerResponse) => {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          // 初回接続確立のための keep-alive コメント
          res.write(":\n\n");

          sseClients.add(res);
          // 接続時に組版済み PDF が存在する場合は即座に通知する
          if (currentPdf) {
            res.write("event: updated\ndata: \n\n");
          }
          req.on("close", () => {
            sseClients.delete(res);
          });
        },
      );

      // GET /__minitype/app.js
      // ブラウザ向けにビルドされた React プレビューアプリを配信する
      server.middlewares.use(
        "/__minitype/app.js",
        (_req: IncomingMessage, res: ServerResponse) => {
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(previewAppJs);
        },
      );

      // GET /__minitype/pdf.worker.js
      // pdfjs-dist のワーカーファイルを配信する
      server.middlewares.use(
        "/__minitype/pdf.worker.js",
        (_req: IncomingMessage, res: ServerResponse) => {
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(workerJs);
        },
      );

      // GET /__minitype/result.pdf
      // 組版完了後，ブラウザがこのエンドポイントから PDF を取得する
      server.middlewares.use(
        "/__minitype/result.pdf",
        (_req: IncomingMessage, res: ServerResponse) => {
          if (currentPdf) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Cache-Control", "no-store");
            res.end(currentPdf);
          } else {
            res.statusCode = 404;
            res.end();
          }
        },
      );

      // GET /
      // プレビュー用 HTML を返す
      server.middlewares.use(
        "/",
        (_req: IncomingMessage, res: ServerResponse) => {
          const entryDisplay = options.entry ?? "index.ts";
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(htmlTemplate.replace("%ENTRY%", entryDisplay));
        },
      );

      // 初回実行
      server.httpServer?.once("listening", () => {
        runEntry(server);
      });
    },

    // ビルドモード：組版処理を実行して組版結果の PDF をディスクに書き出す．
    async closeBundle() {
      if (
        resolvedConfig.command !== "build" ||
        resolvedConfig.build.ssr ||
        resolvedConfig.build.watch
      ) {
        return;
      }
      await runBuildHandler(
        options.entry,
        projectRoot,
        resolveMinitypeId,
        loadMinitypeModule,
      );
    },

    // .ts ファイル変更時に再組版する
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".ts")) {
        // Vite のデフォルト HMR（ページリロード等）を抑制し，
        // SSE 経由でプレビューのみ更新する
        runEntry(server);
        return [];
      }
    },
  };
};

export default minitypePlugin;
