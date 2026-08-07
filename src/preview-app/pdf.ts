import * as pdfjs from "pdfjs-dist";

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

    pages.push({
      url,
      width: viewport.width / deviceScale,
      height: viewport.height / deviceScale,
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
