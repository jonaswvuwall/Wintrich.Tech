# Domain Use Cases

This folder contains the business rules and application-specific business logic.

## Purpose
- Orchestrate the flow of data to and from entities
- Implement application-specific business rules
- Coordinate domain entities and repository interfaces
- Independent of UI and infrastructure details

## Example
```typescript
export class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
```
