/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import styled from "@emotion/styled";
import { colors } from "./color.js";

export const PanelWrapper = styled.div<{ $width: number }>`
  width: ${(props) => props.$width}px;
  height: calc(100vh - 40px - 32px);
  margin: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: ${colors.white};
  position: fixed;
  top: 40px;
  left: 0;
  z-index: 100;
`;

export const PanelItemList = styled.div`
  padding: 4px 0;
  flex: 1;
  overflow-y: auto;
`;

export const PanelEmptyState = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
`;
