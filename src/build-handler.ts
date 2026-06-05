import { writeFileSync } from "node:fs";
import { createServer } from "vite";

export const MINITYPE_PACKAGE = "@minitype/minitype";

type ResolveIdFn = (
  id: string,
  importer: string | undefined,
  ssr: boolean,
) => string | undefined;

type LoadFn = (id: string) => string | undefined;

/**
 * `vite build` 実行時に組版処理を走らせ，PDF をローカルに書き出す．
 */
export const runBuildHandler = async (
  entry: string | undefined,
  projectRoot: string,
  resolveMinitypeId: ResolveIdFn,
  loadMinitypeModule: LoadFn,
): Promise<void> => {
  const buildServer = await createServer({
    root: projectRoot,
    // HTTP サーバを起動しない
    server: { middlewareMode: true },
    appType: "custom",
    ssr: { noExternal: [MINITYPE_PACKAGE] },
    plugins: [
      {
        name: "minitype-build",
        enforce: "pre",
        resolveId(id, importer, opts) {
          return resolveMinitypeId(id, importer, opts.ssr ?? false);
        },
        load(id) {
          return loadMinitypeModule(id);
        },
      },
    ],
    logLevel: "silent",
  });

  (globalThis as any).__minitypeSendResult = (
    pdf: Uint8Array,
    outputPath?: string,
  ) => {
    if (outputPath) {
      writeFileSync(outputPath, Buffer.from(pdf));
      console.log(`[minitype] PDF saved: ${outputPath}`);
    } else {
      console.warn(
        "[minitype] PDF was generated but no output path was specified. Call save() with a path.",
      );
    }
  };
  (globalThis as any).__minitypeSendError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[minitype] Typesetting error: ${message}`);
  };

  const rawEntry = entry ?? "index.ts";
  const entryUrl = rawEntry.startsWith("/") ? rawEntry : `/${rawEntry}`;

  try {
    await buildServer.ssrLoadModule(entryUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[minitype] Build failed: ${message}`);
  } finally {
    await buildServer.close();
  }
};
