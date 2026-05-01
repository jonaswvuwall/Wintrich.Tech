import React from 'react';
import styled, { keyframes } from 'styled-components';

const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
`;

const Wrap = styled.span<{ $size: number }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${p => p.$size}px;
  height: ${p => p.$size}px;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .wt-ring {
    transform-origin: 32px 32px;
    animation: ${orbit} 22s linear infinite;
  }

  .wt-node {
    transform-origin: center;
    animation: ${pulse} 3.6s ease-in-out infinite;
  }
  .wt-node:nth-of-type(2) { animation-delay: 0.2s; }
  .wt-node:nth-of-type(3) { animation-delay: 0.4s; }
  .wt-node:nth-of-type(4) { animation-delay: 0.6s; }
  .wt-node:nth-of-type(5) { animation-delay: 0.8s; }
`;

interface LogoProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className, ariaLabel = 'Wintrich.Tech' }) => {
  const gradId = React.useId();
  const glowId = React.useId();
  return (
    <Wrap $size={size} className={className} aria-label={ariaLabel} role="img">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="60%" stopColor="#7C9CFF" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <radialGradient id={glowId} cx="32" cy="32" r="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="32" cy="32" r="30" fill={`url(#${glowId})`} />

        <g className="wt-ring">
          <circle cx="32" cy="32" r="27" stroke={`url(#${gradId})`} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 6" />
        </g>

        <path
          d="M14 20 L22 44 L32 28 L42 44 L50 20"
          stroke={`url(#${gradId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        <g>
          <circle className="wt-node" cx="14" cy="20" r="3.2" fill="#0A0F1A" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <circle className="wt-node" cx="22" cy="44" r="3.2" fill="#0A0F1A" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <circle className="wt-node" cx="32" cy="28" r="3.4" fill="#0A0F1A" stroke={`url(#${gradId})`} strokeWidth="2.4" />
          <circle className="wt-node" cx="42" cy="44" r="3.2" fill="#0A0F1A" stroke={`url(#${gradId})`} strokeWidth="2.2" />
          <circle className="wt-node" cx="50" cy="20" r="3.2" fill="#0A0F1A" stroke={`url(#${gradId})`} strokeWidth="2.2" />
        </g>

        <circle cx="32" cy="28" r="1.4" fill="#22D3EE" />
      </svg>
    </Wrap>
  );
};

const LockupRoot = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
  color: inherit;
`;

const Wordmark = styled.span`
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  white-space: nowrap;
  background: linear-gradient(135deg, #E8FBFF 0%, #FFFFFF 50%, #E0E7FF 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;

  b {
    font-weight: 700;
    background: linear-gradient(135deg, #22D3EE 0%, #A78BFA 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

interface LockupProps {
  size?: number;
  className?: string;
}

export const LogoLockup: React.FC<LockupProps> = ({ size = 34, className }) => (
  <LockupRoot className={className}>
    <Logo size={size} />
    <Wordmark>
      Wintrich<b>.Tech</b>
    </Wordmark>
  </LockupRoot>
);
