import React from 'react';

/**
 * Stroke-style icon set used across the dashboard tool cards.
 * Sized via the parent (CardIcon) — these set viewBox + paths only.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const PingIcon: React.FC = () => (
  <svg {...base}>
    <path d="M5 12.55a11 11 0 0 1 14 0" />
    <path d="M2 8.82a16 16 0 0 1 20 0" />
    <path d="M8.5 16.42a6 6 0 0 1 7 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const DnsIcon: React.FC = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18" />
    <path d="M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const HttpIcon: React.FC = () => (
  <svg {...base}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const TlsIcon: React.FC = () => (
  <svg {...base}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const SecurityIcon: React.FC = () => (
  <svg {...base}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const BoltIcon: React.FC = () => (
  <svg {...base}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
