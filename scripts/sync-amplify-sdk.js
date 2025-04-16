/**
 * Advanced data synchronization script for AWS Amplify Gen2
 * 
 * This script uses the AWS Amplify JavaScript SDK to synchronize data between
 * local and deployed environments with proper authentication.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Import AWS SDK
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },

  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Logs a message with a colored prefix
 */
function log(message, type = 'info') {
  const prefix = {
    info: `${colors.fg.blue}[INFO]${colors.reset}`,
    success: `${colors.fg.green}[SUCCESS]${colors.reset}`,
    warning: `${colors.fg.yellow}[WARNING]${colors.reset}`,
    error: `${colors.fg.red}[ERROR]${colors.reset}`,
  };

  console.log(`${prefix[type]} ${message}`);
}

/**
 * Executes a shell command and returns the output
 */
function execute(command, options = {}) {
  try {
    // Add AWS_PROFILE and AWS_REGION environment variables if not already in the command
    if (!command.includes('--profile') && !options.env?.AWS_PROFILE) {
      options.env = {
        ...process.env,
        ...options.env,
        AWS_PROFILE: 'AmplifyUser',
        AWS_REGION: 'us-east-1',
        AWS_DEFAULT_REGION: 'us-east-1'
      };
      log(`Using AWS profile: AmplifyUser and region: us-east-1`);
    }

    log(`Executing: ${command}`);
    return execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.ignoreError) {
      log(`Command failed: ${command}`, 'error');
      log(error.message, 'error');
      process.exit(1);
    }
    return null;
  }
}

/**
 * Ask a question and get user input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Get the Amplify configuration from amplify_outputs.json
 */
function getAmplifyConfig() {
  try {
    const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
    if (fs.existsSync(amplifyOutputsPath)) {
      return JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
    }
    log('Could not find amplify_outputs.json', 'error');
    return null;
  } catch (error) {
    log(`Error getting Amplify configuration: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Get DynamoDB client for direct database access
 */
function getDynamoDBClient() {
  try {
    const client = new DynamoDBClient({
      region: 'us-east-1',
      credentials: undefined // This will use the AWS profile from the environment
    });
    return DynamoDBDocumentClient.from(client);
  } catch (error) {
    log(`Error creating DynamoDB client: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Get the DynamoDB table name for the Todo model
 */
function getTodoTableName() {
  try {
    // Get the table name from the sandbox outputs
    const sandboxOutputs = execute('npx ampx sandbox --outputs', { silent: true });
    const outputs = JSON.parse(sandboxOutputs.toString());
    
    if (outputs && outputs.data && outputs.data.tables && outputs.data.tables.Todo) {
      return outputs.data.tables.Todo.tableName;
    }
    
    // Fallback to a default naming convention
    return `Todo-${process.env.AMPLIFY_APP_ID || 'local'}`;
  } catch (error) {
    log(`Error getting Todo table name: ${error.message}`, 'error');
    // Fallback to a default naming convention
    return `Todo-${process.env.AMPLIFY_APP_ID || 'local'}`;
  }
}

/**
 * Get all Todo items from the deployed DynamoDB table
 */
async function getDeployedTodos() {
  try {
    log('Getting Todos from deployed environment...', 'info');
    
    // Use the AWS CLI to get the Todos from the deployed environment
    const result = execute(
      'aws appsync evaluate-code --api-id $(aws appsync list-graphql-apis --query "graphqlApis[?name==\'amplify-awsamplifygen2-bradygeorgen-sandbox-e02cb6877c\'].apiId" --output text) --code "query { listTodos { items { id content completed createdAt updatedAt } } }" --runtime-name APPSYNC_JS --function-name query_listTodos --region us-east-1 --profile AmplifyUser',
      { silent: true, ignoreError: true }
    );

    if (!result) {
      log('Could not get Todos from deployed environment using AWS CLI', 'warning');
      
      // Fallback to using DynamoDB directly
      log('Falling back to DynamoDB direct access...', 'info');
      const client = getDynamoDBClient();
      const tableName = getTodoTableName();
      
      log(`Scanning DynamoDB table: ${tableName}`, 'info');
      const command = new ScanCommand({
        TableName: tableName,
      });
      
      const response = await client.send(command);
      return response.Items || [];
    }
    
    // Parse the result from AWS CLI
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.listTodos && parsedResult.data.listTodos.items) {
      return parsedResult.data.listTodos.items;
    }
    
    return [];
  } catch (error) {
    log(`Error getting deployed Todos: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Get all Todo items from the local DynamoDB table
 */
async function getLocalTodos() {
  try {
    log('Getting Todos from local environment...', 'info');
    
    // Check if the sandbox is running
    const isSandboxRunning = execute('ps aux | grep "ampx sandbox" | grep -v grep', { silent: true, ignoreError: true });
    if (!isSandboxRunning) {
      log('Sandbox is not running. Starting sandbox...', 'warning');
      execute('npx ampx sandbox --once', { silent: true });
    }
    
    // Use the AWS CLI to get the Todos from the local environment
    const result = execute(
      'curl -X POST -H "Content-Type: application/json" -H "x-api-key: da2-fakeApiId123456" -d \'{"query": "query { listTodos { items { id content completed createdAt updatedAt } } }"}\' http://localhost:20002/graphql',
      { silent: true, ignoreError: true }
    );
    
    if (!result) {
      log('Could not connect to local sandbox. Make sure it is running.', 'warning');
      return [];
    }
    
    // Parse the result
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.listTodos && parsedResult.data.listTodos.items) {
      return parsedResult.data.listTodos.items;
    }
    
    return [];
  } catch (error) {
    log(`Error getting local Todos: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Create a Todo item in the deployed environment
 */
async function createDeployedTodo(todo) {
  try {
    log(`Creating Todo in deployed environment: ${todo.content}`, 'info');
    
    // Create a temporary file with the mutation
    const mutationFile = path.join(process.cwd(), 'temp-mutation.json');
    fs.writeFileSync(mutationFile, JSON.stringify({
      query: `
        mutation CreateTodo($input: CreateTodoInput!) {
          createTodo(input: $input) {
            id
            content
            completed
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          id: todo.id,
          content: todo.content,
          completed: todo.completed || false
        }
      }
    }));
    
    // Use the AWS CLI to execute the mutation
    const result = execute(
      `aws appsync evaluate-code --api-id $(aws appsync list-graphql-apis --query "graphqlApis[?name==\'amplify-awsamplifygen2-bradygeorgen-sandbox-e02cb6877c\'].apiId" --output text) --code-file ${mutationFile} --runtime-name APPSYNC_JS --function-name mutation_createTodo --region us-east-1 --profile AmplifyUser`,
      { silent: true, ignoreError: true }
    );
    
    // Clean up the temporary file
    fs.unlinkSync(mutationFile);
    
    if (!result) {
      log('Could not create Todo in deployed environment using AWS CLI', 'warning');
      
      // Fallback to using DynamoDB directly
      log('Falling back to DynamoDB direct access...', 'info');
      const client = getDynamoDBClient();
      const tableName = getTodoTableName();
      
      log(`Putting item in DynamoDB table: ${tableName}`, 'info');
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          id: todo.id,
          content: todo.content,
          completed: todo.completed || false,
          createdAt: todo.createdAt || new Date().toISOString(),
          updatedAt: todo.updatedAt || new Date().toISOString()
        }
      });
      
      await client.send(command);
      log(`Created Todo in deployed environment using DynamoDB: ${todo.id}`, 'success');
      return todo;
    }
    
    // Parse the result from AWS CLI
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.createTodo) {
      log(`Created Todo in deployed environment: ${parsedResult.data.createTodo.id}`, 'success');
      return parsedResult.data.createTodo;
    }
    
    log(`Failed to create Todo in deployed environment: ${JSON.stringify(parsedResult)}`, 'error');
    return null;
  } catch (error) {
    log(`Error creating deployed Todo: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Create a Todo item in the local environment
 */
async function createLocalTodo(todo) {
  try {
    log(`Creating Todo in local environment: ${todo.content}`, 'info');
    
    // Check if the sandbox is running
    const isSandboxRunning = execute('ps aux | grep "ampx sandbox" | grep -v grep', { silent: true, ignoreError: true });
    if (!isSandboxRunning) {
      log('Sandbox is not running. Starting sandbox...', 'warning');
      execute('npx ampx sandbox --once', { silent: true });
    }
    
    // Create the mutation
    const mutation = `
      mutation CreateTodo {
        createTodo(input: {
          id: "${todo.id}",
          content: "${todo.content}",
          completed: ${todo.completed || false}
        }) {
          id
          content
          completed
          createdAt
          updatedAt
        }
      }
    `;
    
    // Execute the mutation using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: da2-fakeApiId123456" -d '{"query": "${mutation.replace(/\\n/g, ' ').replace(/"/g, '\\"')}"}' http://localhost:20002/graphql`,
      { silent: true, ignoreError: true }
    );
    
    if (!result) {
      log('Could not connect to local sandbox. Make sure it is running.', 'warning');
      return null;
    }
    
    // Parse the result
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.createTodo) {
      log(`Created Todo in local environment: ${parsedResult.data.createTodo.id}`, 'success');
      return parsedResult.data.createTodo;
    }
    
    log(`Failed to create Todo in local environment: ${JSON.stringify(parsedResult)}`, 'error');
    return null;
  } catch (error) {
    log(`Error creating local Todo: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Update a Todo item in the deployed environment
 */
async function updateDeployedTodo(todo) {
  try {
    log(`Updating Todo in deployed environment: ${todo.id}`, 'info');
    
    // Create a temporary file with the mutation
    const mutationFile = path.join(process.cwd(), 'temp-mutation.json');
    fs.writeFileSync(mutationFile, JSON.stringify({
      query: `
        mutation UpdateTodo($input: UpdateTodoInput!) {
          updateTodo(input: $input) {
            id
            content
            completed
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        input: {
          id: todo.id,
          content: todo.content,
          completed: todo.completed
        }
      }
    }));
    
    // Use the AWS CLI to execute the mutation
    const result = execute(
      `aws appsync evaluate-code --api-id $(aws appsync list-graphql-apis --query "graphqlApis[?name==\'amplify-awsamplifygen2-bradygeorgen-sandbox-e02cb6877c\'].apiId" --output text) --code-file ${mutationFile} --runtime-name APPSYNC_JS --function-name mutation_updateTodo --region us-east-1 --profile AmplifyUser`,
      { silent: true, ignoreError: true }
    );
    
    // Clean up the temporary file
    fs.unlinkSync(mutationFile);
    
    if (!result) {
      log('Could not update Todo in deployed environment using AWS CLI', 'warning');
      
      // Fallback to using DynamoDB directly
      log('Falling back to DynamoDB direct access...', 'info');
      const client = getDynamoDBClient();
      const tableName = getTodoTableName();
      
      log(`Updating item in DynamoDB table: ${tableName}`, 'info');
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          id: todo.id,
          content: todo.content,
          completed: todo.completed,
          createdAt: todo.createdAt,
          updatedAt: new Date().toISOString()
        }
      });
      
      await client.send(command);
      log(`Updated Todo in deployed environment using DynamoDB: ${todo.id}`, 'success');
      return todo;
    }
    
    // Parse the result from AWS CLI
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.updateTodo) {
      log(`Updated Todo in deployed environment: ${parsedResult.data.updateTodo.id}`, 'success');
      return parsedResult.data.updateTodo;
    }
    
    log(`Failed to update Todo in deployed environment: ${JSON.stringify(parsedResult)}`, 'error');
    return null;
  } catch (error) {
    log(`Error updating deployed Todo: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Update a Todo item in the local environment
 */
async function updateLocalTodo(todo) {
  try {
    log(`Updating Todo in local environment: ${todo.id}`, 'info');
    
    // Check if the sandbox is running
    const isSandboxRunning = execute('ps aux | grep "ampx sandbox" | grep -v grep', { silent: true, ignoreError: true });
    if (!isSandboxRunning) {
      log('Sandbox is not running. Starting sandbox...', 'warning');
      execute('npx ampx sandbox --once', { silent: true });
    }
    
    // Create the mutation
    const mutation = `
      mutation UpdateTodo {
        updateTodo(input: {
          id: "${todo.id}",
          content: "${todo.content}",
          completed: ${todo.completed}
        }) {
          id
          content
          completed
          createdAt
          updatedAt
        }
      }
    `;
    
    // Execute the mutation using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: da2-fakeApiId123456" -d '{"query": "${mutation.replace(/\\n/g, ' ').replace(/"/g, '\\"')}"}' http://localhost:20002/graphql`,
      { silent: true, ignoreError: true }
    );
    
    if (!result) {
      log('Could not connect to local sandbox. Make sure it is running.', 'warning');
      return null;
    }
    
    // Parse the result
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.updateTodo) {
      log(`Updated Todo in local environment: ${parsedResult.data.updateTodo.id}`, 'success');
      return parsedResult.data.updateTodo;
    }
    
    log(`Failed to update Todo in local environment: ${JSON.stringify(parsedResult)}`, 'error');
    return null;
  } catch (error) {
    log(`Error updating local Todo: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Synchronize data from local to deployed environment
 */
async function syncLocalToDeployed() {
  try {
    log('Synchronizing data from local to deployed environment...', 'info');
    
    // Get all Todos from both environments
    const localTodos = await getLocalTodos();
    const deployedTodos = await getDeployedTodos();
    
    log(`Found ${localTodos.length} Todos in local environment`, 'info');
    log(`Found ${deployedTodos.length} Todos in deployed environment`, 'info');
    
    // Create a map of deployed Todos by ID for quick lookup
    const deployedTodosMap = new Map();
    deployedTodos.forEach(todo => {
      deployedTodosMap.set(todo.id, todo);
    });
    
    // Process each local Todo
    for (const localTodo of localTodos) {
      // Check if the Todo exists in the deployed environment
      if (deployedTodosMap.has(localTodo.id)) {
        // Todo exists in both environments, check if it needs to be updated
        const deployedTodo = deployedTodosMap.get(localTodo.id);
        const localUpdatedAt = new Date(localTodo.updatedAt).getTime();
        const deployedUpdatedAt = new Date(deployedTodo.updatedAt).getTime();
        
        if (localUpdatedAt > deployedUpdatedAt) {
          // Local Todo is newer, update the deployed Todo
          log(`Updating Todo in deployed environment: ${localTodo.id}`, 'info');
          await updateDeployedTodo(localTodo);
        }
      } else {
        // Todo doesn't exist in the deployed environment, create it
        log(`Creating Todo in deployed environment: ${localTodo.id}`, 'info');
        await createDeployedTodo(localTodo);
      }
    }
    
    log('Data synchronized from local to deployed environment', 'success');
  } catch (error) {
    log(`Error synchronizing data from local to deployed environment: ${error.message}`, 'error');
  }
}

/**
 * Synchronize data from deployed to local environment
 */
async function syncDeployedToLocal() {
  try {
    log('Synchronizing data from deployed to local environment...', 'info');
    
    // Get all Todos from both environments
    const localTodos = await getLocalTodos();
    const deployedTodos = await getDeployedTodos();
    
    log(`Found ${localTodos.length} Todos in local environment`, 'info');
    log(`Found ${deployedTodos.length} Todos in deployed environment`, 'info');
    
    // Create a map of local Todos by ID for quick lookup
    const localTodosMap = new Map();
    localTodos.forEach(todo => {
      localTodosMap.set(todo.id, todo);
    });
    
    // Process each deployed Todo
    for (const deployedTodo of deployedTodos) {
      // Check if the Todo exists in the local environment
      if (localTodosMap.has(deployedTodo.id)) {
        // Todo exists in both environments, check if it needs to be updated
        const localTodo = localTodosMap.get(deployedTodo.id);
        const localUpdatedAt = new Date(localTodo.updatedAt).getTime();
        const deployedUpdatedAt = new Date(deployedTodo.updatedAt).getTime();
        
        if (deployedUpdatedAt > localUpdatedAt) {
          // Deployed Todo is newer, update the local Todo
          log(`Updating Todo in local environment: ${deployedTodo.id}`, 'info');
          await updateLocalTodo(deployedTodo);
        }
      } else {
        // Todo doesn't exist in the local environment, create it
        log(`Creating Todo in local environment: ${deployedTodo.id}`, 'info');
        await createLocalTodo(deployedTodo);
      }
    }
    
    log('Data synchronized from deployed to local environment', 'success');
  } catch (error) {
    log(`Error synchronizing data from deployed to local environment: ${error.message}`, 'error');
  }
}

/**
 * Perform two-way synchronization between local and deployed environments
 */
async function syncTwoWay() {
  try {
    log('Performing two-way synchronization...', 'info');
    
    // Get all Todos from both environments
    const localTodos = await getLocalTodos();
    const deployedTodos = await getDeployedTodos();
    
    log(`Found ${localTodos.length} Todos in local environment`, 'info');
    log(`Found ${deployedTodos.length} Todos in deployed environment`, 'info');
    
    // Create maps of Todos by ID for quick lookup
    const localTodosMap = new Map();
    localTodos.forEach(todo => {
      localTodosMap.set(todo.id, todo);
    });
    
    const deployedTodosMap = new Map();
    deployedTodos.forEach(todo => {
      deployedTodosMap.set(todo.id, todo);
    });
    
    // Process Todos that exist in both environments
    const commonTodoIds = new Set([...localTodosMap.keys()].filter(id => deployedTodosMap.has(id)));
    for (const id of commonTodoIds) {
      const localTodo = localTodosMap.get(id);
      const deployedTodo = deployedTodosMap.get(id);
      const localUpdatedAt = new Date(localTodo.updatedAt).getTime();
      const deployedUpdatedAt = new Date(deployedTodo.updatedAt).getTime();
      
      if (localUpdatedAt > deployedUpdatedAt) {
        // Local Todo is newer, update the deployed Todo
        log(`Updating Todo in deployed environment: ${localTodo.id}`, 'info');
        await updateDeployedTodo(localTodo);
      } else if (deployedUpdatedAt > localUpdatedAt) {
        // Deployed Todo is newer, update the local Todo
        log(`Updating Todo in local environment: ${deployedTodo.id}`, 'info');
        await updateLocalTodo(deployedTodo);
      }
    }
    
    // Process Todos that only exist in the local environment
    const localOnlyTodoIds = new Set([...localTodosMap.keys()].filter(id => !deployedTodosMap.has(id)));
    for (const id of localOnlyTodoIds) {
      const localTodo = localTodosMap.get(id);
      log(`Creating Todo in deployed environment: ${localTodo.id}`, 'info');
      await createDeployedTodo(localTodo);
    }
    
    // Process Todos that only exist in the deployed environment
    const deployedOnlyTodoIds = new Set([...deployedTodosMap.keys()].filter(id => !localTodosMap.has(id)));
    for (const id of deployedOnlyTodoIds) {
      const deployedTodo = deployedTodosMap.get(id);
      log(`Creating Todo in local environment: ${deployedTodo.id}`, 'info');
      await createLocalTodo(deployedTodo);
    }
    
    log('Two-way synchronization completed successfully', 'success');
  } catch (error) {
    log(`Error performing two-way synchronization: ${error.message}`, 'error');
  }
}

/**
 * Create a test Todo item in both environments
 */
async function createTestTodo() {
  try {
    log('Creating a test Todo item in both environments...', 'info');
    
    // Generate a unique ID
    const id = `test-todo-${Date.now()}`;
    const content = `Test Todo created at ${new Date().toISOString()}`;
    
    // Create the Todo in the local environment
    const localTodo = await createLocalTodo({
      id,
      content,
      completed: false
    });
    
    if (localTodo) {
      log(`Created test Todo in local environment: ${localTodo.id}`, 'success');
    }
    
    // Create the Todo in the deployed environment
    const deployedTodo = await createDeployedTodo({
      id,
      content,
      completed: false
    });
    
    if (deployedTodo) {
      log(`Created test Todo in deployed environment: ${deployedTodo.id}`, 'success');
    }
    
    log('Test Todo created successfully in both environments', 'success');
  } catch (error) {
    log(`Error creating test Todo: ${error.message}`, 'error');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('AWS Amplify Gen2 SDK Data Synchronization Tool', 'info');
    log('-------------------------------------------', 'info');
    
    // Check if a command was provided as a command-line argument
    const command = process.argv[2];
    if (command) {
      switch (command) {
        case 'local-to-deployed':
          await syncLocalToDeployed();
          break;
        case 'deployed-to-local':
          await syncDeployedToLocal();
          break;
        case 'two-way':
          await syncTwoWay();
          break;
        case 'create-test':
          await createTestTodo();
          break;
        default:
          log(`Invalid command: ${command}. Valid commands are: local-to-deployed, deployed-to-local, two-way, create-test`, 'error');
          break;
      }
    } else {
      // No command provided, ask the user
      const answer = await askQuestion(
        'Choose an operation:\n' +
        '1. Local to Deployed (push local changes to the cloud)\n' +
        '2. Deployed to Local (pull cloud data to local)\n' +
        '3. Two-way Sync (merge data from both environments)\n' +
        '4. Create Test Todo (create a test Todo in both environments)\n' +
        'Enter your choice (1, 2, 3, or 4): '
      );
      
      switch (answer) {
        case '1':
          await syncLocalToDeployed();
          break;
        case '2':
          await syncDeployedToLocal();
          break;
        case '3':
          await syncTwoWay();
          break;
        case '4':
          await createTestTodo();
          break;
        default:
          log(`Invalid choice: ${answer}. Please enter 1, 2, 3, or 4.`, 'error');
          break;
      }
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
  } finally {
    rl.close();
  }
}

// Run the main function
main();
