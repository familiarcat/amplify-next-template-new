/**
 * Script to create a Todo item using the AWS Amplify JavaScript SDK
 */

const { Amplify } = require('aws-amplify');
const { generateClient } = require('aws-amplify/api');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Get the Amplify configuration
const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));

// Configure Amplify
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: amplifyOutputs.data.url,
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: amplifyOutputs.data.api_key
    }
  }
});

// Generate the client
const client = generateClient();

// Generate a unique ID and content for the Todo
const id = uuidv4();
const content = `Test Todo created at ${new Date().toISOString()}`;

console.log(`Creating Todo with ID: ${id}`);
console.log(`Content: ${content}`);

// Define the GraphQL mutation
const createTodoMutation = `
  mutation CreateTodo($input: CreateTodoInput!) {
    createTodo(input: $input) {
      id
      content
      completed
      createdAt
      updatedAt
    }
  }
`;

// Execute the mutation
async function createTodo() {
  try {
    const variables = {
      input: {
        id,
        content,
        completed: false
      }
    };

    console.log('Executing GraphQL mutation...');
    const result = await client.graphql({
      query: createTodoMutation,
      variables
    });

    console.log('Todo created successfully!');
    console.log(`ID: ${result.data.createTodo.id}`);
    console.log(`Content: ${result.data.createTodo.content}`);
    console.log(`Completed: ${result.data.createTodo.completed}`);
    console.log(`Created At: ${result.data.createTodo.createdAt}`);
    console.log(`Updated At: ${result.data.createTodo.updatedAt}`);
  } catch (error) {
    console.error('Error creating Todo:');
    console.error(error.message);
  }
}

// Run the function
createTodo();
