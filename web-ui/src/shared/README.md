# Shared Layer

The **Shared Layer** contains code that can be used across all layers of the application.

## Characteristics
- No dependencies on other layers
- Pure functions and constants
- Generic and reusable
- Independent of business logic
- Highly testable

## Structure
- `utils/` - Utility functions (date, string, validation, etc.)
- `constants/` - Application-wide constants and enums
- `types/` - Shared TypeScript types and interfaces

## Guidelines
- Keep utilities pure (no side effects)
- Avoid layer-specific imports
- Ensure utilities are well-tested
- Document complex utilities
- Use TypeScript for type safety

## When to Use
Use the shared layer for code that:
- Is needed in multiple layers
- Has no business logic
- Is framework-agnostic
- Can be easily unit tested
- Doesn't depend on external systems
