/**
 * サーバサイド（Node.js）向け minitype ラッパモジュールのコードを生成する．
 * `minitype` 関数を上書きして，PDF をグローバルコールバック経由でプレビューへ送る．
 */
export const generateServerWrapperCode = (): string => {
  return `
import * as realMinitype from "@minitype/minitype";
import path from "node:path";

export * from "@minitype/minitype";

export const minitype = (groups, style, options) => {
  const realDoc = realMinitype.minitype(groups, style ?? {}, options);

  return {
    // PDF をプレビューへ送信する実装で上書き
    async save(outputPath) {
      try {
        const resolvedPath = outputPath != null ? path.resolve(outputPath) : undefined;
        const isPng = resolvedPath?.endsWith(".png") ?? false;
        if (isPng) {
          const images = await realDoc.toImages();
          const pdf = await realDoc.toPdf();
          globalThis.__minitypeSendImages?.(images, resolvedPath, pdf);
        } else {
          const pdf = await realDoc.toPdf();
          globalThis.__minitypeSendResult?.(pdf, resolvedPath);
        }
      } catch (error) {
        globalThis.__minitypeSendError?.(error);
      }
    },
    toPdf: () => realDoc.toPdf(),
    toImages: () => realDoc.toImages(),
    getLayout: () => realDoc.getLayout(),
  };
};
`;
};
