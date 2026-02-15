export const theme = {
  colors: {
    primary: '#00A8E8',      // Light blue
    primaryDark: '#0077B6',  // Darker blue
    primaryLight: '#48CAE4', // Lighter blue
    secondary: '#90E0EF',    // Very light blue
    background: '#0A0A0A',   // Near black
    surface: '#1A1A1A',      // Dark gray
    surfaceLight: '#2A2A2A', // Lighter dark gray
    text: '#FFFFFF',         // White
    textSecondary: '#B0B0B0',// Light gray
    success: '#06D6A0',      // Green
    warning: '#FFD60A',      // Yellow
    error: '#EF476F',        // Red
    border: '#333333',       // Dark border
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
    sm: '0 2px 4px rgba(0, 168, 232, 0.1)',
    md: '0 4px 8px rgba(0, 168, 232, 0.15)',
    lg: '0 8px 16px rgba(0, 168, 232, 0.2)',
    glow: '0 0 20px rgba(0, 168, 232, 0.3)',
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
