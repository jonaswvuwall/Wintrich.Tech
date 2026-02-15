# Infrastructure Repositories

This folder contains concrete implementations of repository interfaces defined in the domain layer.

## Purpose
- Implement repository interfaces from the domain layer
- Handle data persistence (API, local storage, etc.)
- Transform between DTOs and domain entities
- Manage caching and data synchronization

## Example
```typescript
export class UserRepositoryImpl implements UserRepository {
  constructor(private apiClient: UserApiClient) {}

  async findById(id: string): Promise<User | null> {
    try {
      const dto = await this.apiClient.fetchUser(id);
      return this.mapDtoToEntity(dto);
    } catch (error) {
      return null;
    }
  }

  async findAll(): Promise<User[]> {
    const dtos = await this.apiClient.fetchUsers();
    return dtos.map(dto => this.mapDtoToEntity(dto));
  }

  async save(user: User): Promise<User> {
    const dto = this.mapEntityToDto(user);
    const savedDto = await this.apiClient.createUser(dto);
    return this.mapDtoToEntity(savedDto);
  }

  async delete(id: string): Promise<void> {
    await this.apiClient.deleteUser(id);
  }

  private mapDtoToEntity(dto: UserDTO): User {
    return {
      id: dto.id,
      name: dto.name,
      email: dto.email,
      createdAt: new Date(dto.createdAt),
    };
  }

  private mapEntityToDto(user: User): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```
