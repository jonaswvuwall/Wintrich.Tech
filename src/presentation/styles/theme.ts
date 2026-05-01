export const theme = {
  colors: {
    primary: '#22D3EE',        // Electric cyan
    primaryDark: '#0891B2',    // Deep cyan
    primaryLight: '#67E8F9',   // Light cyan
    accent: '#A78BFA',         // Violet accent
    accentDark: '#7C3AED',     // Deep violet
    secondary: '#7C9CFF',      // Bridge blue
    background: '#06070C',     // Near black ink
    backgroundAlt: '#0A0F1A',  // Slight blue ink
    surface: '#0E1117',        // Card surface
    surfaceLight: '#161B22',   // Elevated surface
    text: '#F4F4F5',           // Off white
    textSecondary: '#94A3B8',  // Slate
    textMuted: '#64748B',      // Muted slate
    success: '#10E0A8',        // Mint
    warning: '#FBBF24',        // Amber
    error: '#F43F5E',           // Rose
    info: '#22D3EE',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.14)',
    cardBackground: 'rgba(14, 17, 23, 0.72)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  shadows: {
    sm: '0 2px 8px rgba(34, 211, 238, 0.08)',
    md: '0 6px 20px rgba(34, 211, 238, 0.12)',
    lg: '0 16px 48px rgba(34, 211, 238, 0.18)',
    glow: '0 0 32px rgba(34, 211, 238, 0.35)',
    glowViolet: '0 0 32px rgba(167, 139, 250, 0.35)',
  },
  gradients: {
    brand: 'linear-gradient(135deg, #22D3EE 0%, #7C9CFF 55%, #A78BFA 100%)',
    brandSoft: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(167,139,250,0.15) 100%)',
    text: 'linear-gradient(135deg, #E8FBFF 0%, #FFFFFF 50%, #E0E7FF 100%)',
    glassBorder: 'linear-gradient(135deg, rgba(34,211,238,0.4) 0%, rgba(167,139,250,0.4) 100%)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
};

export type Theme = typeof theme;
