/**
 * Copyright (c) 2026 Yuto Wada.
 * Released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { colors } from "./color.js";
import type { AppStatus } from "./Toolbar.jsx";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Overlay = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  position: absolute;
  inset: 0;
  z-index: 10;
`;

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${colors.lightGray};
  border-top-color: ${colors.purple};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const OverlayText = styled.div`
  color: ${colors.gray};
  font-size: 13px;
`;

const ErrorBox = styled.div`
  width: 90%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ErrorLabel = styled.span`
  color: ${colors.error};
  font-size: 13px;
  font-weight: 600;
`;

const ErrorDetail = styled.pre`
  max-height: 320px;
  color: ${colors.lightGray};
  font-size: 12px;
  background: ${colors.black};
  border-radius: 8px;
  padding: 14px 16px;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
`;

interface StatusOverlayProps {
  /** 現在のアプリ状態． */
  status: AppStatus;
  /** エラーメッセージ． */
  error: string | null;
}

const StatusOverlay = ({ status, error }: StatusOverlayProps) => {
  return (
    <Overlay>
      {status === "error" ? (
        <ErrorBox>
          <ErrorLabel>Error</ErrorLabel>
          <ErrorDetail>{error}</ErrorDetail>
        </ErrorBox>
      ) : (
        <>
          <Spinner />
          <OverlayText>
            {status === "rendering" ? "Rendering..." : "Typesetting..."}
          </OverlayText>
        </>
      )}
    </Overlay>
  );
};

export default StatusOverlay;
