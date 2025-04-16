import { Schema } from "@/amplify/data/resource";
import { createAIHooks } from "@aws-amplify/ui-react-ai";
import { generateClient } from "aws-amplify/api";

// Determine if we're in a local environment
const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Configure the client based on the environment
export const client = generateClient<Schema>({
  authMode: "apiKey",
  // Always use us-east-1 region to match the deployed environment
  region: 'us-east-1',
  // For local development, explicitly set the endpoint to the sandbox endpoint
  ...(isLocal && {
    endpoint: 'http://localhost:20002/graphql',
    apiKey: 'da2-fakeApiId123456' // Required when using a custom endpoint with apiKey authMode
    // AWS credentials will be loaded from the AWS profile
  })
});

// Log the client configuration for debugging
console.log('Amplify client configuration:', {
  isLocal,
  region: 'us-east-1',
  endpoint: isLocal ? 'http://localhost:20002/graphql' : undefined,
  apiKey: isLocal ? 'da2-fakeApiId123456' : undefined,
  authMode: 'apiKey'
});

export const { useAIConversation, useAIGeneration } = createAIHooks(client);
