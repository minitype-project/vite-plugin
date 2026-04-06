import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { generatePreviewHtml } from "./preview.js";
import { generateServerWrapperCode } from "./server-wrapper.js";

// SSR コンテキストで `minitype` インポートを差し替えるラッパーモジュール
const SERVER_WRAPPER = "\0minitype-server-wrapper";

/**
 * `@minitype/vite-plugin` のオプション．
 */
export interface MinitypePluginOptions {
  /**
   * 組版エントリファイルの相対パス．
   * @default 'index.ts'
   */
  entry?: string;
}

/**
 * minitype の Vite プラグインを生成する．
 *
 * 本プラグインは以下の機能を提供する．
 * - Vite 開発サーバ（Node.js）上で組版処理を実行する．ファイルの変更を検知して再度組版する．
 * - SSE を用いて組版の状態をクライアントに通知する．
 * - ブラウザ上でのプレビュー機能を提供する．
 */
export const minitypePlugin = (options: MinitypePluginOptions = {}): Plugin => {
  let projectRoot: string;

  // ------
  // SSE クライアント管理
  // ------
  const sseClients = new Set<ServerResponse>();
  let currentPdf: Buffer | null = null;
  let isRunning = false;
  // 生成された PDF のパス
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
      }
      currentPdf = Buffer.from(pdf);
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

    configResolved(config: ResolvedConfig) {
      projectRoot = config.root;
    },

    // SSR コンテキストの `minitype` インポートを差し替える
    resolveId(
      id: string,
      importer: string | undefined,
      resolveOptions: { ssr?: boolean },
    ) {
      // SSR コンテキストでのみ差し替え
      // SERVER_WRAPPER 自身がインポートする際はスキップ（再帰を防ぐ）
      if (
        id === "minitype" &&
        resolveOptions.ssr &&
        importer !== SERVER_WRAPPER
      ) {
        return SERVER_WRAPPER;
      }
    },

    // 差し替え先のモジュールを返す
    load(id: string) {
      if (id === SERVER_WRAPPER) {
        return generateServerWrapperCode();
      }
    },

    // 開発サーバのセットアップ
    configureServer(server: ViteDevServer) {
      setupGlobals();

      // ファイルを Vite のファイル監視に追加
      const extensions = ["md", "webp", "jpeg", "jpg", "png", "gif", "pdf"];
      server.watcher.add(
        path.join(projectRoot, `**/*.{${extensions.join(",")}}`),
      );

      // .md ファイル変更時の再実行
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
          req.on("close", () => {
            sseClients.delete(res);
          });
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
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(generatePreviewHtml(options));
        },
      );

      // 初回実行
      server.httpServer?.once("listening", () => {
        runEntry(server);
      });
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
