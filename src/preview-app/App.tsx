/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import styled from "@emotion/styled";
import { useRef, useState } from "react";
import { colors } from "./color.js";
import FontsPanel from "./FontsPanel.jsx";
import OutlinePanel from "./OutlinePanel.jsx";
import StatusOverlay from "./StatusOverlay.jsx";
import Toolbar from "./Toolbar.jsx";
import usePageJump from "./usePageJump.js";
import usePdfStream from "./usePdfStream.js";
import { useZoom } from "./useZoom.js";

const MainArea = styled.main`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const Content = styled.div`
  flex: 1;
  position: relative;
  overflow: auto;
`;

const Pages = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  gap: 16px;
`;

const PageJumpIndicator = styled.nav`
  color: ${colors.lightGray};
  font-size: 15px;
  padding: 7px 20px;
  border-radius: 8px;
  transform: translateX(-50%);
  background: ${colors.blackAlpha};
  pointer-events: none;
  z-index: 100;
  position: fixed;
  bottom: 24px;
  left: 50%;
`;

const PdfPage = styled.img`
  border-radius: 2px;
  display: block;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
`;

const OUTLINE_PANEL_DEFAULT_WIDTH = 240;

interface AppProps {
  entry: string;
}

const App = ({ entry }: AppProps) => {
  const [isOutlinePanelOpen, setIsOutlinePanelOpen] = useState(false);
  const [isFontsPanelOpen, setIsFontsPanelOpen] = useState(false);
  const pageRefsRef = useRef<(HTMLImageElement | null)[]>([]);
  const { zoom, isStepZoomRef, contentRef } = useZoom();
  const { status, pages, outline, error, onDownload } = usePdfStream({
    entry,
    zoom,
    isStepZoomRef,
  });
  const { pageJumpInput, onJumpToPage } = usePageJump({
    pages,
    contentRef,
    pageRefsRef,
  });
  const hasPages = pages.length > 0;

  return (
    <>
      <Toolbar
        entry={entry}
        status={status}
        zoom={zoom}
        hasPages={hasPages}
        isOutlinePanelOpen={isOutlinePanelOpen}
        onToggleOutlinePanel={() => {
          setIsOutlinePanelOpen((prev) => !prev);
          setIsFontsPanelOpen(false);
        }}
        isFontsPanelOpen={isFontsPanelOpen}
        onToggleFontsPanel={() => {
          setIsFontsPanelOpen((prev) => !prev);
          setIsOutlinePanelOpen(false);
        }}
        onDownload={onDownload}
      />

      <MainArea>
        {isOutlinePanelOpen && (
          <OutlinePanel
            outline={outline}
            width={OUTLINE_PANEL_DEFAULT_WIDTH}
            onJump={onJumpToPage}
          />
        )}
        {isFontsPanelOpen && <FontsPanel width={OUTLINE_PANEL_DEFAULT_WIDTH} />}
        <Content ref={contentRef}>
          {!hasPages && <StatusOverlay status={status} error={error} />}
          {hasPages && (
            <Pages>
              {pages.map((page, index) => (
                <PdfPage
                  key={index}
                  ref={(el) => {
                    pageRefsRef.current[index] = el;
                  }}
                  src={page.url}
                  alt={`Page ${index + 1}`}
                  width={page.width * zoom}
                  height={page.height * zoom}
                />
              ))}
            </Pages>
          )}
          {pageJumpInput && (
            <PageJumpIndicator>
              {pageJumpInput} / {pages.length}
            </PageJumpIndicator>
          )}
        </Content>
      </MainArea>
    </>
  );
};

export default App;
