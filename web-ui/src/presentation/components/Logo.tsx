import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const spinReverse = keyframes`
  to { transform: rotate(-360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.15); }
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

  .wt-arc {
    transform-origin: 32px 32px;
    animation: ${spin} 18s linear infinite;
  }

  .wt-orbit {
    transform-origin: 32px 32px;
    animation: ${spinReverse} 26s linear infinite;
  }

  .wt-core {
    transform-origin: center;
    transform-box: fill-box;
    animation: ${pulse} 2.8s ease-in-out infinite;
  }
`;

interface LogoProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className, ariaLabel = 'Wintrich.Tech' }) => {
  const gradId = React.useId();
  const softId = React.useId();
  const glowId = React.useId();
  return (
    <Wrap $size={size} className={className} aria-label={ariaLabel} role="img">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="55%" stopColor="#7C9CFF" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id={softId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.6" />
          </linearGradient>
          <radialGradient id={glowId} cx="32" cy="32" r="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#22D3EE" stopOpacity="0.45" />
            <stop offset="60%"  stopColor="#7C9CFF" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft inner glow */}
        <circle cx="32" cy="32" r="26" fill={`url(#${glowId})`} />

        {/* Hexagonal frame — network/infrastructure feel */}
        <polygon
          points="32,4 56,18 56,46 32,60 8,46 8,18"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="1.4"
          strokeOpacity="0.7"
          strokeLinejoin="round"
        />

        {/* Slowly rotating dashed arc */}
        <g className="wt-arc">
          <circle
            cx="32" cy="32" r="29"
            fill="none"
            stroke={`url(#${softId})`}
            strokeWidth="0.8"
            strokeDasharray="2 4"
            strokeOpacity="0.5"
          />
        </g>

        {/* Counter-rotating accent dot */}
        <g className="wt-orbit">
          <circle cx="32" cy="6" r="1.6" fill="#22D3EE" />
        </g>

        {/* W monogram */}
        <path
          d="M16 22 L24 44 L32 30 L40 44 L48 22"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pulsing core dot */}
        <circle className="wt-core" cx="32" cy="30" r="2.4" fill="#22D3EE" />
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
  letter-spacing: -0.015em;
  white-space: nowrap;
  background: linear-gradient(135deg, #F1F5F9 0%, #FFFFFF 50%, #E0E7FF 100%);
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
