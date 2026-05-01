# Domain Repositories (Interfaces)

This folder contains repository interfaces (contracts) that define how data should be accessed.

## Purpose
- Define interfaces for data access without implementation details
- Establish contracts that infrastructure layer will implement
- Keep domain layer independent of data sources
- Enable dependency inversion principle

## Example
```typescript
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
```
