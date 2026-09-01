/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";
import { MdCheck, MdOutlineContentCopy } from "react-icons/md";
import { colors } from "./color.js";
import { PanelEmptyState, PanelItemList, PanelWrapper } from "./PanelBase.js";

const SearchInput = styled.input`
  width: 100%;
  color: ${colors.charcoal};
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid ${colors.lightGray};
  box-sizing: border-box;
  flex-shrink: 0;

  &::placeholder {
    color: ${colors.gray};
  }
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.charcoal};
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
  padding: 6px 16px;
  user-select: text;
  cursor: pointer;

  &:hover {
    background: ${colors.offWhite};
  }
`;

const ItemIcon = styled.span`
  flex-shrink: 0;
  color: ${colors.gray};
  font-size: 14px;
  display: flex;
  align-items: center;
`;

const EmptyState = styled(PanelEmptyState)`
  color: ${colors.charcoal};
`;

interface FontsPanelProps {
  /** パネルの幅（px）． */
  width: number;
}

const FontsPanel = ({ width }: FontsPanelProps) => {
  const [fontKeys, setFontKeys] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/__minitype/fonts")
      .then((res) => res.json())
      .then((keys: string[]) => {
        setFontKeys(keys);
      })
      .catch((err) => {
        console.error("Failed to fetch font keys:", err);
      });
  }, []);

  const onCopy = (key: string) => {
    navigator.clipboard.writeText(key).catch((err) => {
      console.error("Failed to copy font key:", err);
    });
    setCopiedKey(key);
    if (copiedTimerRef.current !== null) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => {
      setCopiedKey(null);
    }, 1500);
  };

  const filtered =
    query === ""
      ? fontKeys
      : fontKeys.filter((key) =>
          key.toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <PanelWrapper $width={width}>
      <SearchInput
        type="text"
        placeholder="Filter fonts"
        value={query}
        onChange={(ev) => {
          setQuery(ev.target.value);
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState>
          {fontKeys.length === 0 ? "Loading..." : "No fonts found"}
        </EmptyState>
      ) : (
        <PanelItemList>
          {filtered.map((key) => (
            <Item
              key={key}
              title="Click to copy"
              onClick={() => {
                onCopy(key);
              }}
            >
              <ItemIcon>
                {copiedKey === key ? <MdCheck /> : <MdOutlineContentCopy />}
              </ItemIcon>
              {key}
            </Item>
          ))}
        </PanelItemList>
      )}
    </PanelWrapper>
  );
};

export default FontsPanel;
