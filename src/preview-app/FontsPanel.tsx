import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";
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

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key).catch((err) => {
      console.error("Failed to copy font key:", err);
    });
    if (copiedTimerRef.current !== null) {
      clearTimeout(copiedTimerRef.current);
    }
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
                handleCopy(key);
              }}
            >
              {key}
            </Item>
          ))}
        </PanelItemList>
      )}
    </PanelWrapper>
  );
};

export default FontsPanel;
