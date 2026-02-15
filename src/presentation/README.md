# Presentation Layer

The **Presentation Layer** is the outermost layer containing all UI-related code.

## Characteristics
- Contains React components, pages, and UI logic
- Depends on all inner layers
- Handles user interactions and display
- Framework-specific (React in this case)

## Structure
- `components/` - Reusable React components
- `pages/` - Page-level components (route handlers)
- `hooks/` - Custom React hooks
- `contexts/` - React Context providers
- `styles/` - CSS/SCSS files and style utilities

## Dependency Rule
This layer can depend on all other layers (application, domain, infrastructure) but should not contain business logic. It should delegate to inner layers through well-defined interfaces.

## Best Practices
- Keep components small and focused
- Separate presentational and container components
- Use custom hooks to abstract complex logic
- Leverage contexts for dependency injection
- Follow React best practices and patterns
