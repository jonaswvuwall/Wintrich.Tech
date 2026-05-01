# Application DTOs (Data Transfer Objects)

This folder contains data transfer objects used for communication between layers.

## Purpose
- Define data structures for API requests and responses
- Transform domain entities to presentation-friendly formats
- Validate and sanitize data crossing layer boundaries
- Decouple internal models from external representations

## Example
```typescript
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO string for JSON serialization
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}
```
