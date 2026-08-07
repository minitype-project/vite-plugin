import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** ズーム倍率． */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];
/** 最小のズーム倍率． */
const ZOOM_MIN = ZOOM_LEVELS[0];
/** 最大のズーム倍率． */
const ZOOM_MAX = ZOOM_LEVELS.at(-1)!;
/** デフォルトのズーム倍率． */
const ZOOM_DEFAULT = 1.0;
/** ホイール 1 回転あたりのズーム倍率の底． */
const WHEEL_ZOOM_FACTOR_BASE = 0.995;

/**
 * ズーム倍率の状態管理，ならびにキーボードおよびホイールによる操作を提供する React Hook．
 */
export const useZoom = () => {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const contentRef = useRef<HTMLDivElement>(null);
  /** 縦方向の画面に対する中央位置の比率．*/
  const verticalCenterRatioRef = useRef<number | null>(null);
  /** 最後のズーム操作がステップ（キーボード）か否かを示すフラグ．*/
  const isStepZoomRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: zoom はエフェクトのトリガーとして使用する
  useLayoutEffect(() => {
    // ズーム後に，縦方向の位置が元の位置と同じようになるように調整
    const content = contentRef.current;
    const ratio = verticalCenterRatioRef.current;
    if (content === null || ratio === null) {
      return;
    }
    content.scrollTop = ratio * content.scrollHeight - content.clientHeight / 2;
    verticalCenterRatioRef.current = null;
  }, [zoom]);

  useEffect(() => {
    /**
     * コンテンツの縦方向の中央を設定する．
     */
    const setVerticalCenter = () => {
      const content = contentRef.current;
      if (content && content.scrollHeight > 0) {
        verticalCenterRatioRef.current =
          (content.scrollTop + content.clientHeight / 2) / content.scrollHeight;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        return;
      }
      if (e.code === "Equal" || e.code === "Plus" || e.code === "Semicolon") {
        e.preventDefault();
        setVerticalCenter();
        isStepZoomRef.current = true;
        setZoom((prev) => {
          const next = ZOOM_LEVELS.find((level) => level > prev);
          return next ?? ZOOM_MAX;
        });
      } else if (e.code === "Minus") {
        e.preventDefault();
        setVerticalCenter();
        isStepZoomRef.current = true;
        setZoom((prev) => {
          const next = [...ZOOM_LEVELS].reverse().find((level) => level < prev);
          return next ?? ZOOM_MIN;
        });
      } else if (e.code === "Digit0") {
        e.preventDefault();
        setVerticalCenter();
        isStepZoomRef.current = true;
        setZoom(ZOOM_DEFAULT);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }
      e.preventDefault();
      setVerticalCenter();
      isStepZoomRef.current = false;
      const factor = WHEEL_ZOOM_FACTOR_BASE ** e.deltaY;
      setZoom((prev) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev * factor)));
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return { zoom, isStepZoomRef, contentRef };
};
