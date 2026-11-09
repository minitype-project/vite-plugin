/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { type RefObject, useEffect, useState } from "react";
import type { PageData } from "./pdf.js";

interface UseCurrentPageOptions {
  /** 現在のページ一覧． */
  pages: PageData[];
  /** 現在のズーム倍率． */
  zoom: number;
  /** スクロールコンテナの ref． */
  contentRef: RefObject<HTMLDivElement | null>;
  /** ページ要素の ref 配列． */
  pageRefsRef: RefObject<(HTMLElement | null)[]>;
}

/**
 * コンテナの縦方向の中央に最も近いページのインデックスを求める．
 */
const findCenterPageIndex = (
  elements: (HTMLElement | null)[],
  container: HTMLElement,
): number => {
  const center = container.scrollTop + container.clientHeight / 2;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  elements.forEach((element, index) => {
    if (element === null) {
      return;
    }
    const top = element.offsetTop;
    const bottom = top + element.offsetHeight;
    const distance = Math.max(top - center, center - bottom, 0);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });
  return nearestIndex;
};

/**
 * 画面中央に表示されているページのインデックスを提供する React Hook．
 */
const useCurrentPage = ({
  pages,
  zoom,
  contentRef,
  pageRefsRef,
}: UseCurrentPageOptions) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: contentRef, pageRefsRef は ref であり，zoom はエフェクトのトリガーとして使用する
  useEffect(() => {
    const container = contentRef.current;
    if (container === null) {
      return;
    }
    const updateCurrentPage = () => {
      setCurrentPageIndex(
        findCenterPageIndex(
          pageRefsRef.current.slice(0, pages.length),
          container,
        ),
      );
    };
    updateCurrentPage();
    container.addEventListener("scroll", updateCurrentPage, { passive: true });
    window.addEventListener("resize", updateCurrentPage);
    return () => {
      container.removeEventListener("scroll", updateCurrentPage);
      window.removeEventListener("resize", updateCurrentPage);
    };
  }, [pages, zoom]);

  return currentPageIndex;
};

export default useCurrentPage;
