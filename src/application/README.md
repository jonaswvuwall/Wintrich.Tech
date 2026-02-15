# Application Layer

The **Application Layer** acts as a bridge between the domain and presentation layers.

## Characteristics
- Orchestrates use cases from the domain layer
- Transforms data between layers using DTOs
- Handles application-specific logic
- Depends on the domain layer but not on infrastructure or presentation

## Structure
- `services/` - Application services that coordinate use cases
- `dtos/` - Data Transfer Objects for layer communication

## Dependency Rule
This layer can depend on the domain layer but should not depend on infrastructure or presentation layers.
