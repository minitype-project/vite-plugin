# @minitype/vite-plugin

[minitype](http://typeset.jp) の Vite プラグインです．
開発サーバ上でファイルの変更を検知して組版を自動実行し，ブラウザ上でリアルタイムプレビューを提供します．

**@minitype/vite-plugin** is a Vite plugin for [minitype](http://typeset.jp).
It detects file changes on the development server to automatically run typesetting and provide a real-time preview in the browser.

## 機能

- ファイルの変更を検知して組版を自動実行
- ブラウザ上での PDF リアルタイムプレビュー
- アウトラインパネル（PDF の目次 + ページジャンプ）の表示
- フォントパネル（登録済みフォント一覧）の表示
- PDF ダウンロード
- `vite build` による PDF のローカル書き出し

## セットアップ

1. `@minitype/vite-plugin` をインストールします．

```bash
# npm
npm install -D vite @minitype/vite-plugin

# yarn
yarn add -D vite @minitype/vite-plugin
```

2. `vite.config.ts` を作成します．

```ts
import { defineConfig } from "vite";
import minitype from "@minitype/vite-plugin";

export default defineConfig({
  plugins: [
    minitype({
      entry: "src/index.ts",
    }),
  ],
});
```

3. `package.json` の `scripts` に以下を追加します．

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

## 使い方

既存の minitype プロジェクトをそのまま使用できます．

`npm run dev` または `npx vite` を通じて開発サーバを起動すると，ブラウザ上でプレビューが表示されます．
`.ts` ファイルやその他の監視対象ファイルを変更するたびに自動で再組版が実行されます．

`npm run build` または `npx vite build` を実行すると，組版結果の PDF をローカルに書き出します．

## プレビューアプリの操作

| 操作 | 説明 |
| --- | --- |
| マウスホイール | ズームイン / ズームアウト |
| Ctrl/Command + `+` / `-` | ズームイン / ズームアウト（ステップ） |
| Ctrl/Command + `0` | 標準倍率にもどす |
| 数字キー + `Enter` | 指定ページへジャンプ |
| Outline ボタン | アウトラインパネルの開閉 |
| Fonts ボタン | フォントパネルの開閉 |
| Download PDF ボタン | PDF をダウンロード |

## オプション

```ts
export interface MinitypePluginOptions {
  entry?: string;
  watchExtensions?: string[];
}
```

| オプション | 型 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `entry?` | `string` | `"src/index.ts"` | 組版エントリファイルの相対パス |
| `watchExtensions?` | `string[]` | `["md", "webp", "jpeg", "jpg", "png", "gif", "pdf"]` | ファイル変更時に再組版をトリガーする拡張子（`.ts` を除く） |

## ライセンス・謝辞

Copyright (c) 2026 Yuto Wada.
This software is released under the MIT License, see [LICENSE](./LICENSE).

本ソフトウェアは，2025 年度下期 未踏アドバンスト事業の支援を受けて開発されました．

- [未踏アドバンスト事業：2025年度下期実施プロジェクト概要（和田PJ）](https://www.ipa.go.jp/jinzai/mitou/advanced/2025second/gaiyou-fj-1.html)
