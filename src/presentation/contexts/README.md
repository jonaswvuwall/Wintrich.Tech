# Presentation Contexts

This folder contains React Context providers for global state management.

## Purpose
- Manage global application state
- Provide dependency injection for services
- Share authentication, theme, and configuration
- Avoid prop drilling

## Example
```tsx
// UserContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '@/domain/entities/User';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const value = {
    currentUser,
    setCurrentUser,
    isAuthenticated: currentUser !== null,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
};
```
