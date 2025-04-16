/**
 * Comprehensive data synchronization script for AWS Amplify Gen2
 *
 * This script synchronizes data between local and deployed environments using Amplify Gen2 APIs.
 * It supports two-way synchronization, ensuring that data is mirrored between environments.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
 * Executes a shell command and returns the output with retry logic
 */
function execute(command, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000; // 1 second
  let retries = 0;

  const executeWithRetry = () => {
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
      if (retries < maxRetries && !options.noRetry) {
        retries++;
        log(`Command failed, retrying (${retries}/${maxRetries}): ${command}`, 'warning');
        // Wait before retrying
        execSync(`sleep ${retryDelay / 1000}`);
        return executeWithRetry();
      } else if (!options.ignoreError) {
        log(`Command failed after ${retries} retries: ${command}`, 'error');
        log(error.message, 'error');
        if (options.exitOnError !== false) {
          process.exit(1);
        }
      }
      return null;
    }
  };

  return executeWithRetry();
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
 * Get the Amplify app ID from the environment
 */
function getAmplifyAppId() {
  try {
    // Try to get the app ID from the environment
    if (process.env.NEXT_PUBLIC_AMPLIFY_APP_ID) {
      return process.env.NEXT_PUBLIC_AMPLIFY_APP_ID;
    }

    // Try to get the app ID from the .env.local file
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envLocalContent.match(/NEXT_PUBLIC_AMPLIFY_APP_ID=([^\n]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try to get the app ID from the amplify_outputs.json file
    const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
    if (fs.existsSync(amplifyOutputsPath)) {
      const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
      if (amplifyOutputs.data && amplifyOutputs.data.url) {
        // Extract the app ID from the URL
        const match = amplifyOutputs.data.url.match(/https:\/\/([^.]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }

    // If we couldn't find the app ID, ask the user
    log('Could not determine Amplify app ID from environment or configuration files.', 'warning');
    return null;
  } catch (error) {
    log(`Error getting Amplify app ID: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Get the GraphQL API endpoint and API key
 */
function getGraphQLEndpoint() {
  try {
    // Get the endpoint and API key from the amplify_outputs.json file
    const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
    if (fs.existsSync(amplifyOutputsPath)) {
      const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
      if (amplifyOutputs.data && amplifyOutputs.data.url) {
        return {
          endpoint: amplifyOutputs.data.url,
          apiKey: amplifyOutputs.data.api_key
        };
      }
    }

    log('Could not determine GraphQL API endpoint from configuration files.', 'warning');
    return null;
  } catch (error) {
    log(`Error getting GraphQL API endpoint: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Check if the sandbox is running and start it if needed
 */
function ensureSandboxRunning() {
  try {
    // Check if the sandbox is running
    const isSandboxRunning = execute('ps aux | grep "ampx sandbox" | grep -v grep', { silent: true, ignoreError: true });
    if (!isSandboxRunning) {
      log('Sandbox is not running. Starting sandbox...', 'warning');
      // Start the sandbox in the background
      execute('npx ampx sandbox &', { silent: false, ignoreError: true });

      // Wait for the sandbox to start
      log('Waiting for sandbox to start...', 'info');
      execute('sleep 5', { silent: true });

      // Check if the sandbox started successfully
      const isSandboxRunningNow = execute('ps aux | grep "ampx sandbox" | grep -v grep', { silent: true, ignoreError: true });
      if (!isSandboxRunningNow) {
        log('Failed to start sandbox. Please start it manually with "npx ampx sandbox".', 'error');
        return false;
      }

      log('Sandbox started successfully.', 'success');
      return true;
    }

    return true;
  } catch (error) {
    log(`Error checking sandbox status: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Execute a GraphQL query or mutation
 */
async function executeGraphQL(query, variables = {}) {
  try {
    const { endpoint, apiKey } = getGraphQLEndpoint();
    if (!endpoint || !apiKey) {
      throw new Error('GraphQL endpoint or API key not found');
    }

    // Create a temporary file with the query/mutation
    const queryFile = path.join(process.cwd(), 'temp-query.json');
    fs.writeFileSync(queryFile, JSON.stringify({
      query: query.replace(/\n/g, ' '),
      variables
    }));

    // Execute the query using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${apiKey}" -d @${queryFile} ${endpoint}`,
      { silent: true }
    );

    // Clean up the temporary file
    fs.unlinkSync(queryFile);

    // Parse the result
    return JSON.parse(result.toString());
  } catch (error) {
    log(`Error executing GraphQL query: ${error.message}`, 'error');
    return null;
  }
}

/**
 * List all Todo items from the deployed environment
 */
async function listDeployedTodos() {
  try {
    const listTodosQuery = `
      query ListTodos {
        listTodos {
          items {
            id
            content
            completed
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await executeGraphQL(listTodosQuery);
    if (result && result.data && result.data.listTodos && result.data.listTodos.items) {
      return result.data.listTodos.items;
    }

    return [];
  } catch (error) {
    log(`Error listing deployed Todos: ${error.message}`, 'error');
    return [];
  }
}

/**
 * List all Todo items from the local environment
 */
async function listLocalTodos() {
  try {
    // Ensure the sandbox is running
    if (!ensureSandboxRunning()) {
      log('Cannot proceed without a running sandbox.', 'error');
      return [];
    }

    // Get the local endpoint from the amplify_outputs.json file
    const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));
    const localEndpoint = amplifyOutputs.data.url;
    const localApiKey = amplifyOutputs.data.api_key;

    // Execute the query using curl
    const listTodosQuery = `
      query ListTodos {
        listTodos {
          items {
            id
            content
            completed
            createdAt
            updatedAt
          }
        }
      }
    `;

    // Create a temporary file with the query
    const queryFile = path.join(process.cwd(), `temp-query-${Date.now()}.json`);
    fs.writeFileSync(queryFile, JSON.stringify({
      query: listTodosQuery.replace(/\n/g, ' ')
    }));

    // Execute the query using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${localApiKey}" -d @${queryFile} ${localEndpoint}`,
      { silent: true, ignoreError: true }
    );

    // Clean up the temporary file
    if (fs.existsSync(queryFile)) {
      fs.unlinkSync(queryFile);
    }

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
    log(`Error listing local Todos: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Create a Todo item in the deployed environment
 */
async function createDeployedTodo(todo) {
  try {
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

    const variables = {
      input: {
        content: todo.content,
        completed: todo.completed || false
      }
    };

    // If the todo has an ID, use it
    if (todo.id) {
      variables.input.id = todo.id;
    }

    const result = await executeGraphQL(createTodoMutation, variables);
    if (result && result.data && result.data.createTodo) {
      log(`Created Todo in deployed environment: ${result.data.createTodo.id}`, 'success');
      return result.data.createTodo;
    }

    log(`Failed to create Todo in deployed environment: ${JSON.stringify(result)}`, 'error');
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
    // Ensure the sandbox is running
    if (!ensureSandboxRunning()) {
      log('Cannot proceed without a running sandbox.', 'error');
      return null;
    }

    // Get the local endpoint from the amplify_outputs.json file
    const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));
    const localEndpoint = amplifyOutputs.data.url;
    const localApiKey = amplifyOutputs.data.api_key;

    // Create the mutation
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

    const variables = {
      input: {
        content: todo.content,
        completed: todo.completed || false
      }
    };

    // If the todo has an ID, use it
    if (todo.id) {
      variables.input.id = todo.id;
    }

    // Create a temporary file with the mutation
    const mutationFile = path.join(process.cwd(), `temp-mutation-${Date.now()}.json`);
    fs.writeFileSync(mutationFile, JSON.stringify({
      query: createTodoMutation.replace(/\n/g, ' '),
      variables
    }));

    // Execute the mutation using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${localApiKey}" -d @${mutationFile} ${localEndpoint}`,
      { silent: true, ignoreError: true }
    );

    // Clean up the temporary file
    if (fs.existsSync(mutationFile)) {
      fs.unlinkSync(mutationFile);
    }

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
    const updateTodoMutation = `
      mutation UpdateTodo($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          content
          completed
          createdAt
          updatedAt
        }
      }
    `;

    const variables = {
      input: {
        id: todo.id,
        content: todo.content,
        completed: todo.completed
      }
    };

    const result = await executeGraphQL(updateTodoMutation, variables);
    if (result && result.data && result.data.updateTodo) {
      log(`Updated Todo in deployed environment: ${result.data.updateTodo.id}`, 'success');
      return result.data.updateTodo;
    }

    log(`Failed to update Todo in deployed environment: ${JSON.stringify(result)}`, 'error');
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
    // Ensure the sandbox is running
    if (!ensureSandboxRunning()) {
      log('Cannot proceed without a running sandbox.', 'error');
      return null;
    }

    // Get the local endpoint from the amplify_outputs.json file
    const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));
    const localEndpoint = amplifyOutputs.data.url;
    const localApiKey = amplifyOutputs.data.api_key;

    // Create the mutation
    const updateTodoMutation = `
      mutation UpdateTodo($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          content
          completed
          createdAt
          updatedAt
        }
      }
    `;

    const variables = {
      input: {
        id: todo.id,
        content: todo.content,
        completed: todo.completed
      }
    };

    // Create a temporary file with the mutation
    const mutationFile = path.join(process.cwd(), `temp-mutation-${Date.now()}.json`);
    fs.writeFileSync(mutationFile, JSON.stringify({
      query: updateTodoMutation.replace(/\n/g, ' '),
      variables
    }));

    // Execute the mutation using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${localApiKey}" -d @${mutationFile} ${localEndpoint}`,
      { silent: true, ignoreError: true }
    );

    // Clean up the temporary file
    if (fs.existsSync(mutationFile)) {
      fs.unlinkSync(mutationFile);
    }

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
 * Delete a Todo item in the deployed environment
 */
async function deleteDeployedTodo(id) {
  try {
    const deleteTodoMutation = `
      mutation DeleteTodo($input: DeleteTodoInput!) {
        deleteTodo(input: $input) {
          id
        }
      }
    `;

    const variables = {
      input: {
        id
      }
    };

    const result = await executeGraphQL(deleteTodoMutation, variables);
    if (result && result.data && result.data.deleteTodo) {
      log(`Deleted Todo in deployed environment: ${result.data.deleteTodo.id}`, 'success');
      return true;
    }

    log(`Failed to delete Todo in deployed environment: ${JSON.stringify(result)}`, 'error');
    return false;
  } catch (error) {
    log(`Error deleting deployed Todo: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Delete a Todo item in the local environment
 */
async function deleteLocalTodo(id) {
  try {
    // Ensure the sandbox is running
    if (!ensureSandboxRunning()) {
      log('Cannot proceed without a running sandbox.', 'error');
      return false;
    }

    // Get the local endpoint from the amplify_outputs.json file
    const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));
    const localEndpoint = amplifyOutputs.data.url;
    const localApiKey = amplifyOutputs.data.api_key;

    // Create the mutation
    const deleteTodoMutation = `
      mutation DeleteTodo($input: DeleteTodoInput!) {
        deleteTodo(input: $input) {
          id
        }
      }
    `;

    const variables = {
      input: {
        id
      }
    };

    // Create a temporary file with the mutation
    const mutationFile = path.join(process.cwd(), `temp-mutation-${Date.now()}.json`);
    fs.writeFileSync(mutationFile, JSON.stringify({
      query: deleteTodoMutation.replace(/\n/g, ' '),
      variables
    }));

    // Execute the mutation using curl
    const result = execute(
      `curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${localApiKey}" -d @${mutationFile} ${localEndpoint}`,
      { silent: true, ignoreError: true }
    );

    // Clean up the temporary file
    if (fs.existsSync(mutationFile)) {
      fs.unlinkSync(mutationFile);
    }

    if (!result) {
      log('Could not connect to local sandbox. Make sure it is running.', 'warning');
      return false;
    }

    // Parse the result
    const parsedResult = JSON.parse(result.toString());
    if (parsedResult && parsedResult.data && parsedResult.data.deleteTodo) {
      log(`Deleted Todo in local environment: ${parsedResult.data.deleteTodo.id}`, 'success');
      return true;
    }

    log(`Failed to delete Todo in local environment: ${JSON.stringify(parsedResult)}`, 'error');
    return false;
  } catch (error) {
    log(`Error deleting local Todo: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Synchronize data from local to deployed environment
 */
async function syncLocalToDeployed() {
  try {
    log('Synchronizing data from local to deployed environment...', 'info');

    // Get all Todos from both environments
    const localTodos = await listLocalTodos();
    const deployedTodos = await listDeployedTodos();

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
    const localTodos = await listLocalTodos();
    const deployedTodos = await listDeployedTodos();

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
    const localTodos = await listLocalTodos();
    const deployedTodos = await listDeployedTodos();

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
 * Main function
 */
async function main() {
  try {
    log('AWS Amplify Gen2 Data Synchronization Tool', 'info');
    log('----------------------------------------', 'info');

    // Check if a sync direction was provided as a command-line argument
    const syncDirection = process.argv[2];
    if (syncDirection) {
      switch (syncDirection) {
        case 'local-to-deployed':
          await syncLocalToDeployed();
          break;
        case 'deployed-to-local':
          await syncDeployedToLocal();
          break;
        case 'two-way':
          await syncTwoWay();
          break;
        default:
          log(`Invalid sync direction: ${syncDirection}. Valid options are: local-to-deployed, deployed-to-local, two-way`, 'error');
          break;
      }
    } else {
      // No sync direction provided, ask the user
      const answer = await askQuestion(
        'Choose a synchronization direction:\n' +
        '1. Local to Deployed (push local changes to the cloud)\n' +
        '2. Deployed to Local (pull cloud data to local)\n' +
        '3. Two-way Sync (merge data from both environments)\n' +
        'Enter your choice (1, 2, or 3): '
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
        default:
          log(`Invalid choice: ${answer}. Please enter 1, 2, or 3.`, 'error');
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
