import styled from "@emotion/styled";
import type React from "react";
import { colors } from "./color.js";
import { PanelEmptyState, PanelItemList, PanelWrapper } from "./PanelBase.js";
import type { OutlineItem } from "./pdf.js";

const EmptyState = styled(PanelEmptyState)`
  color: ${colors.charcoal};
  font-size: 13px;
`;

const Item = styled.div<{ $depth: number }>`
  color: ${colors.charcoal};
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
  padding: 8px 16px 8px ${(props) => 12 + props.$depth * 16}px;

  &:hover {
    background: ${colors.offWhite};
    color: ${colors.charcoal};
  }
`;

interface OutlinePanelProps {
  /** アウトライン項目一覧． */
  outline: OutlineItem[];
  /** パネルの幅（px）． */
  width: number;
  /** 項目クリック時にジャンプ先ページインデックス（0 始まり）を渡すコールバック． */
  onJump: (pageIndex: number) => void;
}

/**
 * アウトライン項目を再帰的にレンダリングする．
 */
const renderItems = (
  items: OutlineItem[],
  depth: number,
  onJump: (pageIndex: number) => void,
): React.ReactNode => {
  return items.map((item, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: アウトライン項目は再組版まで変化しない
    <div key={index}>
      <Item
        $depth={depth}
        onClick={() => {
          onJump(item.pageIndex);
        }}
        title={item.title}
      >
        {item.title}
      </Item>
      {item.items.length > 0 && renderItems(item.items, depth + 1, onJump)}
    </div>
  ));
};

const OutlinePanel = ({ outline, width, onJump }: OutlinePanelProps) => {
  return (
    <PanelWrapper $width={width}>
      {outline.length === 0 ? (
        <EmptyState>No outline</EmptyState>
      ) : (
        <PanelItemList>{renderItems(outline, 0, onJump)}</PanelItemList>
      )}
    </PanelWrapper>
  );
};

export default OutlinePanel;
