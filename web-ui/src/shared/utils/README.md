# Shared Utilities

This folder contains pure utility functions that can be used across all layers.

## Purpose
- Provide reusable helper functions
- Keep utilities pure and side-effect free
- Ensure utilities have no layer dependencies
- Facilitate testing and reusability

## Example
```typescript
// dateUtils.ts
export const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
};

export const isDateInPast = (date: Date): boolean => {
  return date < new Date();
};

// stringUtils.ts
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};
```
