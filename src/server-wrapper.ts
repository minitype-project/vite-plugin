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
  const override = globalThis.__minitypeStyleOverride;
  const mergedStyle = override
    ? realMinitype.mergeDocumentStyle(style ?? {}, override)
    : (style ?? {});
  const realDoc = realMinitype.minitype(groups, mergedStyle, options);

  return {
    // PDF をプレビューへ送信する実装で上書き
    async save(outputPath) {
      try {
        const pdf = await realDoc.toPdf();
        const resolvedPath = outputPath != null ? path.resolve(outputPath) : undefined;
        globalThis.__minitypeSendResult?.(pdf, resolvedPath);
      } catch (error) {
        globalThis.__minitypeSendError?.(error);
        throw error;
      }
    },
    toPdf: () => realDoc.toPdf(),
    toImages: () => realDoc.toImages(),
    getLayout: () => realDoc.getLayout(),
  };
};
`;
};
