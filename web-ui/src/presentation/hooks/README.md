# Presentation Hooks

This folder contains custom React hooks for reusable logic.

## Purpose
- Encapsulate reusable stateful logic
- Abstract complex operations
- Connect to application services
- Share logic across components

## Example
```tsx
// useUser.ts
import { useState, useEffect } from 'react';
import { User } from '@/domain/entities/User';
import { UserService } from '@/application/services/UserService';

export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const userService = new UserService(/* dependencies */);
    
    userService.getUserProfile(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
};
```
