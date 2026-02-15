# Clean Architecture Quick Reference

## 🎯 When to Use Each Layer

### Domain Layer
**Use for:**
- Core business entities
- Business validation rules
- Pure business logic
- Repository interfaces

**Don't use for:**
- UI logic
- API calls
- Framework-specific code
- External dependencies

### Application Layer
**Use for:**
- Coordinating multiple use cases
- Application-level workflows
- DTOs for data transformation
- Service composition

**Don't use for:**
- UI components
- Direct database/API access
- Pure business rules (use domain)

### Infrastructure Layer
**Use for:**
- HTTP/API client implementations
- Repository implementations
- Local/session storage
- Third-party integrations
- Framework adapters

**Don't use for:**
- Business logic
- UI components
- Direct use case definitions

### Presentation Layer
**Use for:**
- React components
- UI logic and state
- User event handlers
- Visual presentation
- Routing

**Don't use for:**
- Business logic (delegate to domain)
- Direct API calls (use infrastructure)
- Complex data transformations (use application)

### Shared Layer
**Use for:**
- Pure utility functions
- Constants and enums
- Common types
- Helper functions

**Don't use for:**
- Layer-specific logic
- Stateful operations
- External dependencies

## 📝 Common Patterns

### Creating a New Feature

1. **Define Entity** (domain/entities)
```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
}
```

2. **Define Repository Interface** (domain/repositories)
```typescript
export interface ProductRepository {
  findById(id: string): Promise<Product>;
  findAll(): Promise<Product[]>;
}
```

3. **Create Use Case** (domain/use-cases)
```typescript
export class GetProductUseCase {
  constructor(private repo: ProductRepository) {}
  execute(id: string) { return this.repo.findById(id); }
}
```

4. **Implement Repository** (infrastructure/repositories)
```typescript
export class ProductRepositoryImpl implements ProductRepository {
  async findById(id: string) {
    // API call logic
  }
}
```

5. **Create Service** (application/services)
```typescript
export class ProductService {
  constructor(private getProduct: GetProductUseCase) {}
  async getProductDisplay(id: string) {
    // Coordinate and format
  }
}
```

6. **Build UI** (presentation)
```tsx
export const ProductPage = () => {
  const { product } = useProduct(id);
  return <ProductCard product={product} />;
};
```

## 🔍 Dependency Injection Example

```typescript
// infrastructure/di/container.ts
export class Container {
  private static productRepository: ProductRepository;
  
  static getProductRepository(): ProductRepository {
    if (!this.productRepository) {
      this.productRepository = new ProductRepositoryImpl();
    }
    return this.productRepository;
  }
  
  static getProductService(): ProductService {
    const repo = this.getProductRepository();
    const useCase = new GetProductUseCase(repo);
    return new ProductService(useCase);
  }
}

// presentation/contexts/ServicesContext.tsx
export const ServicesProvider = ({ children }) => {
  const productService = Container.getProductService();
  return (
    <ServicesContext.Provider value={{ productService }}>
      {children}
    </ServicesContext.Provider>
  );
};
```

## ✅ Architecture Checklist

- [ ] Domain layer has no external dependencies
- [ ] Use cases are framework-agnostic
- [ ] Repository interfaces are in domain, implementations in infrastructure
- [ ] UI components delegate business logic to services/use cases
- [ ] Shared utilities are pure functions
- [ ] Dependencies flow inward only
- [ ] Each layer has clear, single responsibility

## 🚫 Common Anti-Patterns to Avoid

❌ **Don't:** Import infrastructure in domain
```typescript
// domain/use-cases/GetUser.ts - BAD
import { UserApiClient } from '@/infrastructure/api/UserApiClient';
```

✅ **Do:** Use repository interface
```typescript
// domain/use-cases/GetUser.ts - GOOD
import { UserRepository } from '@/domain/repositories/UserRepository';
```

❌ **Don't:** Put business logic in components
```tsx
// presentation/pages/UserPage.tsx - BAD
const calculateDiscount = (price: number) => {
  return price > 100 ? price * 0.9 : price;
};
```

✅ **Do:** Use domain use cases
```tsx
// presentation/pages/UserPage.tsx - GOOD
const discount = calculateDiscountUseCase.execute(price);
```

❌ **Don't:** Make API calls directly in components
```tsx
// presentation/components/UserList.tsx - BAD
const users = await fetch('/api/users').then(r => r.json());
```

✅ **Do:** Use services or hooks
```tsx
// presentation/components/UserList.tsx - GOOD
const { users } = useUsers();
```
