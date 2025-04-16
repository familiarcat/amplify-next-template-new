/**
 * Script to create a test Todo item in the local environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
 * Main function
 */
async function main() {
  try {
    log('Creating a test Todo item in the local environment...', 'info');

    // Create a test Todo item using the GraphQL API
    const createTodoMutation = `
      mutation CreateTodo {
        createTodo(input: {
          content: "Test Todo ${new Date().toISOString()}",
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

    // Write the mutation to a file
    const mutationFile = path.join(process.cwd(), 'create-todo-mutation.graphql');
    fs.writeFileSync(mutationFile, createTodoMutation);

    // Get the AppSync endpoint and API key from the amplify_outputs.json file
    const amplifyOutputs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8'));
    const apiEndpoint = amplifyOutputs.data.url;
    const apiKey = amplifyOutputs.data.api_key;

    // Execute the mutation using curl
    const result = execute(`curl -X POST -H "Content-Type: application/json" -H "x-api-key: ${apiKey}" -d '{"query": "${createTodoMutation.replace(/\n/g, ' ').replace(/"/g, '\\"')}"}' ${apiEndpoint}`, { silent: true });

    // Parse the result
    const resultJson = JSON.parse(result.toString());

    if (resultJson.data && resultJson.data.createTodo) {
      log(`Successfully created Todo item with ID: ${resultJson.data.createTodo.id}`, 'success');
      log(`Todo name: ${resultJson.data.createTodo.name}`, 'success');
      log(`Todo description: ${resultJson.data.createTodo.description}`, 'success');
    } else {
      log('Failed to create Todo item', 'error');
      log(JSON.stringify(resultJson, null, 2), 'error');
    }

    // Clean up the mutation file
    fs.unlinkSync(mutationFile);
  } catch (error) {
    log(`Error creating test Todo item: ${error.message}`, 'error');
  }
}

// Run the main function
main();
