# Shared Types

This folder contains shared TypeScript types and interfaces used across the application.

## Purpose
- Define common types used in multiple layers
- Provide generic utility types
- Ensure type safety across the application
- Avoid type duplication

## Example
```typescript
// common.ts
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T>;

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// state.ts
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

// id.ts
export type ID = string;
export type Timestamp = number;
```
