/**
 * Script to create a Todo item using the GraphQL API
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Get the Amplify configuration
const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));
const apiEndpoint = amplifyOutputs.data.url;
const apiKey = amplifyOutputs.data.api_key;

// Generate a unique ID and content for the Todo
const id = uuidv4();
const content = `Test Todo created at ${new Date().toISOString()}`;

console.log(`Creating Todo with ID: ${id}`);
console.log(`Content: ${content}`);
console.log(`API Endpoint: ${apiEndpoint}`);

// Create the mutation
const createTodoMutation = `
  mutation CreateTodo {
    createTodo(input: {
      id: "${id}",
      content: "${content}",
      completed: false
    }) {
      id
      content
      completed
      createdAt
      updatedAt
    }
  }
`;

// Execute the mutation
try {
  // Create a temporary file with the mutation
  const mutationFile = path.join(process.cwd(), 'temp-mutation.json');
  fs.writeFileSync(mutationFile, JSON.stringify({
    query: createTodoMutation.replace(/\n/g, ' ')
  }));

  // Execute the mutation using curl
  console.log('Executing GraphQL mutation...');
  const result = execSync(
    `curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${apiKey}" -d @${mutationFile} ${apiEndpoint}`,
    { stdio: 'pipe' }
  );

  // Clean up the temporary file
  fs.unlinkSync(mutationFile);

  // Parse the result
  const parsedResult = JSON.parse(result.toString());

  if (parsedResult.data && parsedResult.data.createTodo) {
    console.log('Todo created successfully!');
    console.log(`ID: ${parsedResult.data.createTodo.id}`);
    console.log(`Content: ${parsedResult.data.createTodo.content}`);
    console.log(`Completed: ${parsedResult.data.createTodo.completed}`);
    console.log(`Created At: ${parsedResult.data.createTodo.createdAt}`);
    console.log(`Updated At: ${parsedResult.data.createTodo.updatedAt}`);
  } else if (parsedResult.errors) {
    console.error('Error creating Todo:');
    console.error(JSON.stringify(parsedResult.errors, null, 2));

    // Try creating the Todo using the AWS CLI
    console.log('\nTrying to create Todo using AWS CLI...');

    // Create a temporary file with the AWS CLI command
    const cliFile = path.join(process.cwd(), 'temp-cli-command.sh');
    fs.writeFileSync(cliFile, `
      #!/bin/bash
      aws appsync evaluate-code \
        --api-id $(aws appsync list-graphql-apis --query "graphqlApis[?name=='amplify-awsamplifygen2-bradygeorgen-sandbox-e02cb6877c'].apiId" --output text) \
        --code "mutation { createTodo(input: { id: \"${id}\", content: \"${content}\", completed: false }) { id content completed createdAt updatedAt } }" \
        --runtime-name APPSYNC_JS \
        --function-name mutation_createTodo \
        --region us-east-1 \
        --profile AmplifyUser
    `);

    // Make the file executable
    execSync(`chmod +x ${cliFile}`);

    // Execute the AWS CLI command
    try {
      const cliResult = execSync(cliFile, { stdio: 'pipe' });
      console.log('AWS CLI result:');
      console.log(cliResult.toString());
    } catch (cliError) {
      console.error('Error executing AWS CLI command:');
      console.error(cliError.message);
    }

    // Clean up the temporary file
    fs.unlinkSync(cliFile);
  } else {
    console.error('Unknown error creating Todo:');
    console.error(JSON.stringify(parsedResult, null, 2));
  }
} catch (error) {
  console.error('Error executing mutation:');
  console.error(error.message);
}
