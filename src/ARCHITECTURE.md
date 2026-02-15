# Clean Architecture - Frontend Structure

This project follows **Clean Architecture** principles to create a maintainable, testable, and scalable frontend application.

## 🏗️ Architecture Overview

Clean Architecture organizes code into layers with clear boundaries and dependency rules. Dependencies only flow inward—outer layers can depend on inner layers, but never the reverse.

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │  ← React Components, Pages, Hooks
├─────────────────────────────────────────┤
│        Infrastructure Layer             │  ← API Clients, Storage, External Services
├─────────────────────────────────────────┤
│         Application Layer               │  ← Services, DTOs, Orchestration
├─────────────────────────────────────────┤
│          Domain Layer                   │  ← Entities, Use Cases, Business Logic
└─────────────────────────────────────────┘
              Shared Layer                    ← Utils, Constants, Types
```

## 📁 Folder Structure

```
src/
├── domain/                 # Core business logic (innermost layer)
│   ├── entities/          # Business entities and models
│   ├── repositories/      # Repository interfaces (contracts)
│   └── use-cases/         # Business rules and application logic
│
├── application/           # Application layer
│   ├── services/         # Application services
│   └── dtos/             # Data Transfer Objects
│
├── infrastructure/        # External concerns
│   ├── api/              # HTTP clients and API calls
│   ├── repositories/     # Repository implementations
│   └── storage/          # Local/session storage
│
├── presentation/          # UI layer (outermost layer)
│   ├── components/       # React components
│   ├── pages/           # Page-level components
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React Context providers
│   └── styles/          # CSS/SCSS files
│
└── shared/               # Cross-cutting concerns
    ├── utils/           # Utility functions
    ├── constants/       # Application constants
    └── types/           # Shared TypeScript types
```

## 🎯 Layer Responsibilities

### Domain Layer (Core)
- **Purpose**: Contains business logic and rules
- **Dependencies**: None (completely independent)
- **Contains**: Entities, use cases, repository interfaces
- **Examples**: User entity, GetUserUseCase, UserRepository interface

### Application Layer
- **Purpose**: Orchestrates use cases and coordinates workflows
- **Dependencies**: Domain layer only
- **Contains**: Services, DTOs
- **Examples**: UserService, CreateUserDTO

### Infrastructure Layer
- **Purpose**: Implements interfaces and handles external systems
- **Dependencies**: Domain layer (implements its interfaces)
- **Contains**: API clients, repository implementations, storage
- **Examples**: UserRepositoryImpl, UserApiClient, LocalStorageService

### Presentation Layer
- **Purpose**: Handles UI and user interactions
- **Dependencies**: All layers (but primarily Application layer)
- **Contains**: React components, pages, hooks, contexts
- **Examples**: UserProfile component, useUser hook, UserContext

### Shared Layer
- **Purpose**: Provides utilities used across all layers
- **Dependencies**: None (pure utilities)
- **Contains**: Helper functions, constants, common types
- **Examples**: formatDate(), API_BASE_URL, ApiResponse<T>

## 🔄 Dependency Flow

The **Dependency Rule** is the key principle:

```
Presentation → Infrastructure
     ↓              ↓
Application ← ← ← ← ←
     ↓
  Domain (Core)
     ↑
  Shared
```

- **Inward only**: Outer layers depend on inner layers
- **Never outward**: Inner layers never import from outer layers
- **Interfaces**: Inner layers define interfaces that outer layers implement

## 🚀 Getting Started

### 1. Start with Domain Layer
Define your entities and business rules first:
```typescript
// domain/entities/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
}
```

### 2. Define Use Cases
Implement business logic:
```typescript
// domain/use-cases/GetUserUseCase.ts
export class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}
  
  async execute(id: string): Promise<User> {
    return await this.userRepository.findById(id);
  }
}
```

### 3. Implement Infrastructure
Create concrete implementations:
```typescript
// infrastructure/repositories/UserRepositoryImpl.ts
export class UserRepositoryImpl implements UserRepository {
  async findById(id: string): Promise<User> {
    // API call implementation
  }
}
```

### 4. Build UI Layer
Create React components:
```tsx
// presentation/pages/UserPage.tsx
export const UserPage = () => {
  const { user } = useUser(userId);
  return <UserProfile user={user} />;
};
```

## ✅ Benefits

- **Testability**: Easy to unit test business logic
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to swap implementations
- **Scalability**: Organized structure scales well
- **Independence**: Business logic independent of frameworks

## 📚 Additional Resources

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Clean Architecture for React Apps](https://dev.to/rubemfsv/clean-architecture-applying-with-react-40h6)

---

**Note**: Each folder contains a README.md with detailed examples and guidelines. Refer to those for layer-specific information.
