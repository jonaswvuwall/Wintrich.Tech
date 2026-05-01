# Domain Layer

The **Domain Layer** is the innermost layer of clean architecture and contains the core business logic.

## Characteristics
- **No external dependencies**: This layer should not depend on any other layer
- **Framework independent**: No React, no UI libraries
- **Pure TypeScript/JavaScript**: Only business logic
- **Highly testable**: Easy to unit test without mocks

## Structure
- `entities/` - Business objects and models
- `repositories/` - Repository interfaces (contracts)
- `use-cases/` - Business rules and application logic

## Dependency Rule
This layer should not import anything from outer layers (application, infrastructure, presentation).
