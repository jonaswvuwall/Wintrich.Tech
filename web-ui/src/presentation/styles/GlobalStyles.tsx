import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    color-scheme: dark;
  }

  html, body, #root {
    min-height: 100%;
    width: 100%;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: ${theme.colors.background};
    color: ${theme.colors.text};
    line-height: 1.6;
    letter-spacing: -0.005em;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    position: relative;
  }

  /* Ambient page-wide aurora */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background:
      radial-gradient(60vmax 60vmax at 12% 8%, rgba(34, 211, 238, 0.18), transparent 60%),
      radial-gradient(55vmax 55vmax at 92% 18%, rgba(167, 139, 250, 0.16), transparent 60%),
      radial-gradient(60vmax 60vmax at 50% 110%, rgba(124, 156, 255, 0.14), transparent 60%);
  }

  body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%);
  }

  #root {
    position: relative;
    z-index: 1;
  }

  h1, h2, h3, h4 {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  code, pre, kbd, samp {
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.gradients.brand};
    border-radius: 999px;
    border: 2px solid ${theme.colors.background};
  }

  ::-webkit-scrollbar-thumb:hover {
    filter: brightness(1.15);
  }

  ::selection {
    background: rgba(34, 211, 238, 0.35);
    color: #ffffff;
  }

  a {
    color: inherit;
  }

  button {
    font-family: inherit;
  }

  /* Smooth transitions for all interactive elements */
  a, button, input, textarea, select {
    transition: all ${theme.transitions.fast};
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
