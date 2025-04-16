"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the LocalAuthProvider to avoid SSR issues
const LocalAuthProvider = dynamic(
  () => import('./LocalAuthProvider').then(mod => mod.LocalAuthProvider),
  { ssr: false }
);

export function BasicLayout({ children }: { children: React.ReactNode }) {
  // State to track if we're in a local environment
  const [isLocal, setIsLocal] = useState(false);
  // State to track if the component is mounted
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Check if we're in a local environment
    setIsLocal(window.location.hostname === 'localhost');
    // Mark the component as mounted
    setIsMounted(true);
  }, []);

  // Don't render anything until the component is mounted
  // This prevents hydration errors
  if (!isMounted) {
    return null;
  }

  // Use LocalAuthProvider for local development, Authenticator for production
  if (isLocal) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }

  // Use Amplify Authenticator for production
  return (
    <Authenticator.Provider>
      <Authenticator>
        {children}
      </Authenticator>
    </Authenticator.Provider>
  );
}
