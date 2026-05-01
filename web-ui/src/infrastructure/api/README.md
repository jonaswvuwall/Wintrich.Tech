# Infrastructure API

This folder contains implementations for external API communication.

## Purpose
- Implement HTTP clients and API calls
- Handle API authentication and error handling
- Transform API responses to domain entities
- Manage API configuration and endpoints

## Example
```typescript
export class UserApiClient {
  constructor(private baseUrl: string) {}

  async fetchUser(id: string): Promise<UserDTO> {
    const response = await fetch(`${this.baseUrl}/users/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  }

  async createUser(data: CreateUserDTO): Promise<UserDTO> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}
```
