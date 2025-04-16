import { Schema } from "@/amplify/data/resource";
import { createAIHooks } from "@aws-amplify/ui-react-ai";
import { generateClient } from "aws-amplify/api";

// Configure the client to use the cloud endpoint for both environments
const clientConfig: any = {
  authMode: "apiKey"
};

// Create the client
export const client = generateClient<Schema>(clientConfig);

// Log the client configuration for debugging
console.log('Amplify client configuration:', {
  authMode: clientConfig.authMode,
  buildMode: process.env.NEXT_PUBLIC_BUILD_MODE || 'unknown'
});

export const { useAIConversation, useAIGeneration } = createAIHooks(client);
