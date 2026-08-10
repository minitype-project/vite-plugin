/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import styled from "@emotion/styled";
import { colors, statusColors } from "./color.js";

const Wrapper = styled.header`
  height: 40px;
  color: ${colors.lightGray};
  font-size: 13px;
  padding: 16px;
  background: ${colors.black};
  display: flex;
  justify-content: space-between;
`;

const Inner = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Logo = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${colors.purple};
`;

const Slash = styled.span`
  color: ${colors.gray};
  margin: 0 8px;
`;

const Entry = styled.span`
  font-size: 13px;
`;

const ZoomLabel = styled.span`
  font-size: 12px;
  min-width: 3.5em;
  text-align: right;
`;

export type AppStatus = "typesetting" | "rendering" | "ready" | "error";

const statusBadgeBg = (status: AppStatus): string => {
  switch (status) {
    case "typesetting":
    case "rendering":
      return statusColors.processing;
    case "ready":
      return statusColors.ready;
    case "error":
      return statusColors.error;
  }
};

const StatusBadge = styled.span<{ $status: AppStatus }>`
  color: ${colors.charcoal};
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 12px;
  background: ${(props) => statusBadgeBg(props.$status)};
  transition:
    background 0.2s,
    color 0.2s;
`;

const Buttons = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Button = styled.button<{ $active?: boolean }>`
  color: ${(props) => (props.$active ? colors.purple : "inherit")};
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: none;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);

  &:hover {
    color: ${colors.purple};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface ToolbarProps {
  /** エントリファイル名． */
  entry: string;
  /** 現在のアプリ状態． */
  status: AppStatus;
  /** 現在のズーム倍率． */
  zoom: number;
  /** PDF ページが存在するか． */
  hasPages: boolean;
  /** アウトラインパネルが開いているか． */
  isOutlinePanelOpen: boolean;
  /** フォントパネルが開いているか． */
  isFontsPanelOpen: boolean;
  /** アウトラインパネルの開閉を切り替えるコールバック． */
  onToggleOutlinePanel: () => void;
  /** フォントパネルの開閉を切り替えるコールバック． */
  onToggleFontsPanel: () => void;
  /** PDF ダウンロードボタンのコールバック． */
  onDownload: () => void;
}

const Toolbar = ({
  entry,
  status,
  zoom,
  hasPages,
  isOutlinePanelOpen,
  isFontsPanelOpen,
  onToggleOutlinePanel,
  onToggleFontsPanel,
  onDownload,
}: ToolbarProps) => {
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Wrapper>
      <Inner>
        <div>
          <Logo>minitype</Logo>
          <Slash>/</Slash>
          <Entry>{entry}</Entry>
        </div>
        <ZoomLabel>{Math.round(zoom * 100)}%</ZoomLabel>
        <Buttons>
          <Button
            type="button"
            $active={isOutlinePanelOpen}
            onClick={onToggleOutlinePanel}
          >
            Outline
          </Button>
          <Button
            type="button"
            $active={isFontsPanelOpen}
            onClick={onToggleFontsPanel}
          >
            Fonts
          </Button>
        </Buttons>
      </Inner>
      <Inner>
        <StatusBadge $status={status}>{statusText}</StatusBadge>
        <Button type="button" disabled={!hasPages} onClick={onDownload}>
          Download PDF
        </Button>
      </Inner>
    </Wrapper>
  );
};

export default Toolbar;
