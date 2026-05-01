# Shared Constants

This folder contains application-wide constants and configuration values.

## Purpose
- Define magic numbers and strings
- Centralize configuration values
- Provide type-safe enums
- Make code more maintainable

## Example
```typescript
// apiConstants.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;

// routeConstants.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  USERS: '/users',
  USER_DETAIL: '/users/:id',
} as const;

// statusConstants.ts
export enum Status {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

// validationConstants.ts
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
} as const;
```
