/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import * as pdfjs from "pdfjs-dist";

type LinkBase = {
  /** ページ幅に対する左端の位置（0..1）． */
  left: number;
  /** ページ高さに対する上端の位置（0..1）． */
  top: number;
  /** ページ幅に対する幅（0..1）． */
  width: number;
  /** ページ高さに対する高さ（0..1）． */
  height: number;
};

/**
 * 外部リンク注釈．
 */
export type ExternalLink = LinkBase & {
  url: string;
};

/**
 * 内部リンク注釈．
 */
export type InternalLink = LinkBase & {
  /** ジャンプ先ページインデックス（0 始まり）． */
  pageIndex: number;
};

/**
 * ページ上のリンク注釈．
 */
export type LinkAnnotation = ExternalLink | InternalLink;

/**
 * レンダリング済みページのデータ．
 */
export type PageData = {
  /** blob URL． */
  url: string;
  /** CSS 幅（px）． */
  width: number;
  /** CSS 高さ（px）． */
  height: number;
  /** ページ上のリンク注釈一覧． */
  links: LinkAnnotation[];
};

/**
 * PDF のしおり（アウトライン）項目．
 */
export type OutlineItem = {
  /** 見出しテキスト． */
  title: string;
  /** ジャンプ先ページインデックス（0 始まり）． */
  pageIndex: number;
  /** 子項目． */
  items: OutlineItem[];
};

/**
 * PDF の ArrayBuffer を受け取り，各ページを blob URL に変換する．
 * zoom を考慮したスケールでレンダリングし，CSS サイズは zoom 適用前の自然サイズを返す．
 */
export const renderPdf = async (
  data: ArrayBuffer,
  zoom = 1,
): Promise<PageData[]> => {
  const deviceScale = (window.devicePixelRatio || 1) * zoom;
  // pdfjs は postMessage の transfer list に ArrayBuffer を渡して worker に送るため，
  // 呼び出し元のバッファが detach されないようにコピーを作成する．
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
    .promise;
  const pages: PageData[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: deviceScale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(`Failed to get canvas context for page ${pageNum}`);
    }

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const url = await new Promise<string>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          reject(new Error(`Failed to create blob for page ${pageNum}`));
        }
      }, "image/png");
    });

    const rawAnnotations = await page.getAnnotations();
    const links: LinkAnnotation[] = [];

    for (const ann of rawAnnotations) {
      if (ann.subtype !== "Link") {
        continue;
      }
      // PDF 座標系（左下原点）をビューポート座標系（左上原点）に変換し，0..1 に正規化
      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(
        ann.rect,
      );
      const left = Math.min(vx1, vx2) / viewport.width;
      const top = Math.min(vy1, vy2) / viewport.height;
      const width = Math.abs(vx2 - vx1) / viewport.width;
      const height = Math.abs(vy2 - vy1) / viewport.height;

      if (ann.url) {
        links.push({ left, top, width, height, url: ann.url });
        continue;
      }
      if (ann.dest) {
        try {
          let dest = ann.dest;
          if (typeof dest === "string") {
            dest = await pdf.getDestination(dest);
          }
          if (dest?.[0]) {
            const pageIndex = await pdf.getPageIndex(dest[0]);
            links.push({ left, top, width, height, pageIndex });
          }
        } catch {
          // ページ解決に失敗した場合はスキップ
        }
      }
    }

    pages.push({
      url,
      width: viewport.width / deviceScale,
      height: viewport.height / deviceScale,
      links,
    });
  }

  await pdf.destroy();
  return pages;
};

/**
 * PDF からしおり（アウトライン）を取得する．
 * しおりが存在しない場合は空配列を返す．
 */
export const getPdfOutline = async (
  data: ArrayBuffer,
): Promise<OutlineItem[]> => {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
    .promise;
  try {
    const rawOutline = await pdf.getOutline();
    if (!rawOutline) {
      return [];
    }

    const resolveItems = async (
      items: (typeof rawOutline)[number][],
    ): Promise<OutlineItem[]> => {
      const result: OutlineItem[] = [];
      for (const item of items) {
        let pageIndex = 0;
        try {
          let dest = item.dest;
          if (typeof dest === "string") {
            dest = await pdf.getDestination(dest);
          }
          if (dest?.[0]) {
            pageIndex = await pdf.getPageIndex(dest[0]);
          }
        } catch {
          // ページ解決に失敗した場合は先頭ページを使用する
        }
        result.push({
          title: item.title,
          pageIndex,
          items: item.items?.length ? await resolveItems(item.items) : [],
        });
      }
      return result;
    };

    return await resolveItems(rawOutline);
  } finally {
    await pdf.destroy();
  }
};
