"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button, Flex, Heading, Text, TextField, View, useTheme } from "@aws-amplify/ui-react";

// Safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

// Define the user type
type User = {
  username: string;
  email: string;
  isAuthenticated: boolean;
};

// Define the auth context type
type AuthContextType = {
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a LocalAuthProvider');
  }
  return context;
};

// Local storage keys
const USER_STORAGE_KEY = 'local_auth_user';

// LocalAuthProvider component
export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { tokens } = useTheme();

  // Load user from local storage on mount
  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) return;

    const storedUser = storage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Error parsing stored user:', err);
        storage.removeItem(USER_STORAGE_KEY);
      }
    } else {
      // If no user is found, show the auth form
      setShowAuthForm(true);
    }
  }, []);

  // Sign in function
  const signIn = async (username: string, password: string) => {
    try {
      // In a real app, this would call an API
      // For local development, we'll just simulate a successful sign-in
      const user: User = {
        username,
        email: `${username}@example.com`, // Simulated email
        isAuthenticated: true,
      };

      setUser(user);
      setIsAuthenticated(true);

      const storage = getLocalStorage();
      if (storage) {
        storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }

      setShowAuthForm(false);
      setError('');
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in. Please try again.');
    }
  };

  // Sign up function
  const signUp = async (username: string, email: string, password: string) => {
    try {
      // In a real app, this would call an API
      // For local development, we'll just simulate a successful sign-up
      const user: User = {
        username,
        email,
        isAuthenticated: true,
      };

      setUser(user);
      setIsAuthenticated(true);

      const storage = getLocalStorage();
      if (storage) {
        storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }

      setShowAuthForm(false);
      setError('');
    } catch (err) {
      console.error('Error signing up:', err);
      setError('Failed to sign up. Please try again.');
    }
  };

  // Sign out function
  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);

    const storage = getLocalStorage();
    if (storage) {
      storage.removeItem(USER_STORAGE_KEY);
    }

    setShowAuthForm(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'signIn') {
      signIn(username, password);
    } else {
      signUp(username, email, password);
    }
  };

  // Toggle between sign in and sign up modes
  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
    setError('');
  };

  // If the user is authenticated, render the children
  if (isAuthenticated && user) {
    return (
      <AuthContext.Provider value={{ user, signIn, signUp, signOut, isAuthenticated }}>
        <View padding={tokens.space.small}>
          <Flex justifyContent="space-between" alignItems="center">
            <Text>Signed in as: {user.username}</Text>
            <Button variation="link" onClick={signOut}>Sign Out</Button>
          </Flex>
        </View>
        {children}
      </AuthContext.Provider>
    );
  }

  // Otherwise, render the auth form
  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isAuthenticated }}>
      {showAuthForm ? (
        <View
          padding={tokens.space.large}
          backgroundColor={tokens.colors.background.primary}
          borderRadius={tokens.radii.medium}
          maxWidth="400px"
          margin="0 auto"
          marginTop={tokens.space.xxl}
        >
          <Heading level={3} marginBottom={tokens.space.medium}>
            {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
          </Heading>

          {error && (
            <Text color={tokens.colors.font.error} marginBottom={tokens.space.small}>
              {error}
            </Text>
          )}

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap={tokens.space.medium}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              {authMode === 'signUp' && (
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variation="primary" width="100%">
                {authMode === 'signIn' ? 'Sign In' : 'Sign Up'}
              </Button>

              <Button
                type="button"
                variation="link"
                onClick={toggleAuthMode}
                width="100%"
              >
                {authMode === 'signIn'
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Button>
            </Flex>
          </form>
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
