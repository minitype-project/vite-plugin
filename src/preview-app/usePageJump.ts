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
import type { PageData } from "./pdf.js";

interface UsePageJumpOptions {
  /** 現在のページ一覧． */
  pages: PageData[];
  /** スクロールコンテナの ref． */
  contentRef: RefObject<HTMLDivElement | null>;
  /** ページ要素の ref 配列． */
  pageRefsRef: RefObject<(HTMLImageElement | null)[]>;
}

/**
 * コンテナをスクロールして，要素を画面中央に表示する．
 */
const scrollToCenter = (element: HTMLElement, container: HTMLElement) => {
  const top =
    element.offsetTop - (container.clientHeight - element.offsetHeight) / 2;
  container.scrollTo({ top, behavior: "smooth" });
};

/**
 * キーボード入力によるページジャンプ機能を提供する React Hook．
 */
const usePageJump = ({
  pages,
  contentRef,
  pageRefsRef,
}: UsePageJumpOptions) => {
  // 画面表示用の入力文字列（state）と，イベントリスナ内で参照するための ref を並行して管理する．
  // イベントリスナは初回マウント時のクロージャを保持するため，state を直接参照すると古い値になる．
  const [pageJumpInput, setPageJumpInput] = useState("");
  const pageJumpInputRef = useRef("");

  const pageJumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagesRef = useRef(pages);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  /**
   * 指定インデックスのページが画面中央に来るようにスクロールする．
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentRef, pageRefsRef は ref であり，dep に含める必要はない
  const onJumpToPage = useCallback((pageIndex: number) => {
    const element = pageRefsRef.current[pageIndex];
    const container = contentRef.current;
    if (element && container) {
      scrollToCenter(element, container);
    }
  }, []);

  // 数字キーの連続入力でページ番号を組み立て，Enter で確定・ジャンプ
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentRef, pageRefsRef は ref であり，dep に含める必要はない
  useEffect(() => {
    const clearInput = () => {
      pageJumpInputRef.current = "";
      setPageJumpInput("");
      pageJumpTimerRef.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // フォーム要素にフォーカスがある間はジャンプ操作を無効化
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // 数字キー：入力を蓄積する．3 秒間操作がなければ自動クリア
      if (/^\d$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
        if (pageJumpTimerRef.current !== null) {
          clearTimeout(pageJumpTimerRef.current);
        }
        pageJumpInputRef.current += e.key;
        setPageJumpInput(pageJumpInputRef.current);
        pageJumpTimerRef.current = setTimeout(clearInput, 3000);
      }
      // Enter キー：蓄積した数字をページ番号として解釈してジャンプ
      else if (e.key === "Enter" && pageJumpInputRef.current !== "") {
        if (pageJumpTimerRef.current !== null) {
          clearTimeout(pageJumpTimerRef.current);
        }
        const pageNum = parseInt(pageJumpInputRef.current, 10);
        const currentPages = pagesRef.current;
        if (currentPages.length > 0) {
          const index = Math.min(
            Math.max(pageNum - 1, 0),
            currentPages.length - 1,
          );
          const element = pageRefsRef.current[index];
          const container = contentRef.current;
          if (element && container) {
            scrollToCenter(element, container);
          }
        }
        clearInput();
      }
      // Escape キー：入力をキャンセル
      else if (e.key === "Escape" && pageJumpInputRef.current !== "") {
        if (pageJumpTimerRef.current !== null) {
          clearTimeout(pageJumpTimerRef.current);
        }
        clearInput();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return { pageJumpInput, onJumpToPage };
};

export default usePageJump;
