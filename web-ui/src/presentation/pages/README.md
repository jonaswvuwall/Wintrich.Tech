# Presentation Pages

This folder contains page-level components that represent entire views/routes.

## Purpose
- Define top-level route components
- Compose multiple components into complete pages
- Handle page-specific logic and state
- Connect to application services

## Example
```tsx
// UserProfilePage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserService } from '@/application/services/UserService';
import { UserProfile } from '@/presentation/components/UserProfile';

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userService = new UserService(/* dependencies */);
    userService.getUserProfile(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return <UserProfile user={user} />;
};
```
