/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getPdfOutline,
  type OutlineItem,
  type PageData,
  renderPdf,
} from "./pdf.js";
import type { AppStatus } from "./Toolbar.jsx";

interface UsePdfStreamOptions {
  /** エントリファイル名． */
  entry: string;
  /** 現在のズーム倍率． */
  zoom: number;
  /** 最後のズーム操作がステップ（キーボード）か否かを示すフラグ． */
  isStepZoomRef: RefObject<boolean>;
}

/**
 * PDF を fetch する．
 */
const fetchPdf = async (): Promise<Response> => {
  const response = await fetch(`/__minitype/result.pdf?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }
  return response;
};

/**
 * SSE によるビルドイベントの購読，PDF の描画・ダウンロードを提供する React Hook．
 */
const usePdfStream = ({ entry, zoom, isStepZoomRef }: UsePdfStreamOptions) => {
  const [status, setStatus] = useState<AppStatus>("typesetting");
  const [pages, setPages] = useState<PageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  // fetch および描画が並行して発生した場合に，古い結果を棄てるためのバージョンカウンタ．
  // 新しい updated イベントが来るたびにインクリメントし，完了時に一致しなければ破棄する．
  const renderVersionRef = useRef(0);

  // zoom 変化による再描画と updated イベントの描画が競合した場合の棄却に使うカウンタ．
  // renderVersionRef とは独立しており，zoom 変化だけでインクリメントされる．
  const zoomRenderVersionRef = useRef(0);

  const pdfDataRef = useRef<ArrayBuffer | null>(null);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  /**
   * PDF をダウンロードする．
   */
  const onDownload = useCallback(async () => {
    try {
      const response = await fetchPdf();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // エントリ名の拡張子を .pdf に変えて保存
      a.download = `${entry.replace(/\.[^/.]+$/, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
    }
  }, [entry]);

  /**
   * ビルド完了イベント（updated）を受け取り，PDF を fetch して描画する．
   */
  const onUpdated = useCallback(async () => {
    const version = ++renderVersionRef.current;
    setStatus("rendering");

    try {
      const response = await fetchPdf();
      const data = await response.arrayBuffer();

      // fetch 中に次の updated イベントが来ていた場合は破棄
      if (version !== renderVersionRef.current) {
        return;
      }

      pdfDataRef.current = data;
      const [newPages, newOutline] = await Promise.all([
        renderPdf(data, zoomRef.current),
        getPdfOutline(data),
      ]);

      // 描画中に次の updated イベントが来ていた場合は ObjectURL を解放して破棄
      if (version !== renderVersionRef.current) {
        for (const page of newPages) {
          URL.revokeObjectURL(page.url);
        }
        return;
      }

      // 前のページの ObjectURL を解放してからセット
      setPages((prev) => {
        for (const page of prev) {
          URL.revokeObjectURL(page.url);
        }
        return newPages;
      });
      setOutline(newOutline);
      setStatus("ready");
      setError(null);
    } catch (err) {
      if (version === renderVersionRef.current) {
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, []);

  // zoom 変化時に PDF を再レンダリングして解像度を合わせる．
  // renderVersionRef は変更せず，新規 PDF の取得と競合した場合は破棄する．
  // biome-ignore lint/correctness/useExhaustiveDependencies: isStepZoomRef は ref であり，zoom 変化時に最新の値を参照するため dep に含めない
  useEffect(() => {
    const data = pdfDataRef.current;
    if (data === null) {
      return;
    }
    const capturedVersion = renderVersionRef.current;
    const zoomVersion = ++zoomRenderVersionRef.current;

    // ステップズーム（キーボード）は即時，ホイールズームは連続入力を間引くため遅延して実行
    const timer = setTimeout(
      async () => {
        try {
          const newPages = await renderPdf(data, zoom);
          if (
            renderVersionRef.current !== capturedVersion ||
            zoomRenderVersionRef.current !== zoomVersion
          ) {
            for (const page of newPages) {
              URL.revokeObjectURL(page.url);
            }
            return;
          }
          setPages((prev) => {
            for (const page of prev) {
              URL.revokeObjectURL(page.url);
            }
            return newPages;
          });
        } catch {
          // zoom 再レンダリングの失敗は非致命的
        }
      },
      isStepZoomRef.current ? 0 : 150,
    );

    return () => {
      clearTimeout(timer);
    };
  }, [zoom]);

  // SSE で 3 種類のイベントを購読する．
  // - updated: ビルド完了 → PDF を再取得・描画
  // - restarted: ビルド再開始 → typesetting 状態に戻す
  // - minitype-error: ビルドエラー → エラーメッセージを表示
  useEffect(() => {
    const eventSource = new EventSource("/__minitype/stream");

    eventSource.addEventListener("updated", onUpdated);

    eventSource.addEventListener("restarted", () => {
      setStatus("typesetting");
      setError(null);
    });

    eventSource.addEventListener("minitype-error", (e) => {
      const event = e as MessageEvent;
      let message: string;
      try {
        message = JSON.parse(event.data).message;
      } catch {
        message = event.data;
      }
      setStatus("error");
      setError(message);
    });

    return () => {
      eventSource.close();
    };
  }, [onUpdated]);

  return { status, pages, outline, error, onDownload };
};

export default usePdfStream;
