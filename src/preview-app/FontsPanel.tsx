import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { panel } from "./color.js";

const Wrapper = styled.div<{ $width: number }>`
  width: ${(props) => props.$width}px;
  margin: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: ${panel.bg};
`;

const SearchInput = styled.input`
  width: 100%;
  color: ${panel.text};
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid ${panel.border};
  box-sizing: border-box;
  flex-shrink: 0;

  &::placeholder {
    color: ${panel.placeholder};
  }
`;

const ItemList = styled.div`
  padding: 4px 0;
  flex: 1;
  overflow-y: auto;
`;

const Item = styled.div`
  color: ${panel.text};
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
  padding: 6px 16px;
  user-select: text;
`;

const EmptyState = styled.div`
  color: ${panel.text};
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
`;

interface FontsPanelProps {
  /** パネルの幅（px）． */
  width: number;
}

const FontsPanel = ({ width }: FontsPanelProps) => {
  const [fontKeys, setFontKeys] = useState<string[]>([]);
  const [query, setQuery] = useState("");

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

  const filtered =
    query === ""
      ? fontKeys
      : fontKeys.filter((key) =>
          key.toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <Wrapper $width={width}>
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
        <ItemList>
          {filtered.map((key) => (
            <Item key={key}>{key}</Item>
          ))}
        </ItemList>
      )}
    </Wrapper>
  );
};

export default FontsPanel;
