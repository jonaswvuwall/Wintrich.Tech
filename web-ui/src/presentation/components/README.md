# Presentation Components

This folder contains reusable React components.

## Purpose
- Build reusable UI components
- Keep components focused and single-purpose
- Separate presentational and container components
- Follow component composition patterns

## Structure
```
components/
  common/          # Shared UI components (Button, Input, Card, etc.)
  layout/          # Layout components (Header, Footer, Sidebar, etc.)
  features/        # Feature-specific components
```

## Example
```tsx
// common/Button.tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
```
