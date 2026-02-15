# Domain Entities

This folder contains the core business entities of your application.

## Purpose
- Define pure business objects with no external dependencies
- Represent the fundamental concepts of your business domain
- Contains only business logic and validation rules
- Independent of frameworks, UI, or infrastructure

## Example
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
```
