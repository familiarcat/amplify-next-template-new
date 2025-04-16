"use client";

import { Amplify } from "aws-amplify";
import { useEffect, useState } from "react";
import outputs from '@/amplify_outputs.json';

// Create a function to determine if we're in a local environment
// This ensures it's only called on the client side
function getIsLocal() {
  return typeof window !== 'undefined' && window.location.hostname === 'localhost';
}

export function ConfigureAmplifyClientSide() {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    try {
      // Configure Amplify on the client side
      Amplify.configure(outputs, { ssr: true });

      setIsConfigured(true);
      console.log(`Amplify configured for ${getIsLocal() ? 'local development' : 'production'} environment`);
    } catch (error) {
      console.error('Error configuring Amplify:', error);
    }
  }, []);

  return null;
}
