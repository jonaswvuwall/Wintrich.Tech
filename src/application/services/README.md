# Application Services

This folder contains application-level services that orchestrate use cases and business logic.

## Purpose
- Coordinate multiple use cases
- Handle application-level concerns (authentication state, notifications, etc.)
- Provide simplified API for the presentation layer
- Manage state transformations

## Example
```typescript
export class UserService {
  constructor(
    private getUserUseCase: GetUserUseCase,
    private updateUserUseCase: UpdateUserUseCase
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.getUserUseCase.execute(userId);
    return this.formatUserForDisplay(user);
  }

  private formatUserForDisplay(user: User) {
    // Application-specific formatting
    return { ...user, displayName: `${user.name} (${user.email})` };
  }
}
```
