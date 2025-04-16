import { Schema } from "@/amplify/data/resource";
import { createAIHooks } from "@aws-amplify/ui-react-ai";
import { generateClient } from "aws-amplify/api";
import { Amplify } from 'aws-amplify';
import { initSchema } from 'aws-amplify/datastore';

// Configure Amplify
Amplify.configure({
  // Enable DataStore with sync enabled
  DataStore: {
    authModes: {
      defaultMode: 'apiKey'
    }
  }
});

// Configure the client to use the cloud endpoint for both environments
const clientConfig: any = {
  authMode: "apiKey"
};

// Create the API client
export const client = generateClient<Schema>(clientConfig);

// Initialize DataStore schema
export const { Todo } = initSchema({
  models: {
    Todo: {
      name: 'Todo',
      fields: {
        id: { type: 'ID', isRequired: true },
        content: { type: 'String', isRequired: true },
        completed: { type: 'Boolean', isRequired: false },
        createdAt: { type: 'AWSDateTime', isRequired: false },
        updatedAt: { type: 'AWSDateTime', isRequired: false },
        owner: { type: 'String', isRequired: false }
      }
    }
  }
});

// Log the client configuration for debugging
console.log('Amplify client configuration:', {
  authMode: clientConfig.authMode,
  buildMode: process.env.NEXT_PUBLIC_BUILD_MODE || 'unknown',
  dataStoreEnabled: true
});

export const { useAIConversation, useAIGeneration } = createAIHooks(client);
