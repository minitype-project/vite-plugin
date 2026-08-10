/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

/** アプリ全体で使用する色． */
export const colors = {
  // グレースケール
  white: "hsl(0, 0%, 100%)",
  offWhite: "hsl(0, 0%, 98%)",
  lightGray: "hsl(0, 0%, 90%)",
  gray: "hsl(0, 0%, 65%)",
  charcoal: "hsl(0, 0%, 20%)",
  black: "hsl(0, 0%, 10%)",
  blackAlpha: "hsla(0, 0%, 10%, 0.9)",
  // その他
  indigo: "hsl(226, 100%, 85%)",
  purple: "hsl(267, 84%, 80%)",
  error: "hsl(343, 81%, 75%)",
} as const;

/** ステータスバッジ色． */
export const statusColors = {
  /** 処理中の背景色． */
  processing: "hsl(22, 92%, 75%)",
  /** 完了状態の背景色． */
  ready: "hsl(115, 54%, 75%)",
  /** エラー状態の背景色． */
  error: "hsl(343, 81%, 75%)",
} as const;
