# Presentation Styles

This folder contains component-specific styles and style utilities.

## Purpose
- Organize CSS/SCSS modules
- Define component-specific styles
- Manage theme variables and design tokens
- Keep styles colocated with components (when using CSS modules)

## Structure
```
styles/
  global.css       # Global styles and resets
  variables.css    # CSS custom properties/design tokens
  themes/          # Theme definitions
```

## Example
```css
/* variables.css */
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
}
```
