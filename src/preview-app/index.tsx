/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { css, Global } from "@emotion/react";
import * as pdfjs from "pdfjs-dist";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { colors } from "./color.js";

// `Map.prototype.getOrInsertComputed` は React 19.2 にて使用されるが，ブラウザでは未実装のためポリフィルを適用
if (!("getOrInsertComputed" in Map.prototype)) {
  (Map.prototype as any).getOrInsertComputed = function <K, V>(
    key: K,
    callbackFn: (_key: K) => V,
  ): V {
    if (!this.has(key)) {
      this.set(key, callbackFn(key));
    }
    return this.get(key);
  };
}

// Vite プラグインのミドルウェアが `/__minitype/pdf.worker.js` を配信する
pdfjs.GlobalWorkerOptions.workerSrc = "/__minitype/pdf.worker.js";

const rootElement = document.getElementById("root");
const entry = rootElement?.dataset.entry ?? "index.ts";

if (rootElement) {
  createRoot(rootElement).render(
    <>
      <Global
        styles={css`
          *,
          *::before,
          *::after {
            font-family: system-ui, -apple-system, sans-serif;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
            
          body {
            background: ${colors.offWhite};
          }

          #root {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
        `}
      />
      <App entry={entry} />
    </>,
  );
}
