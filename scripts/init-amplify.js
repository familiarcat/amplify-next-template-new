/**
 * Amplify initialization script for AWS Amplify Gen2 Next.js applications
 *
 * This script:
 * 1. Checks if AWS credentials are configured
 * 2. Initializes a new Amplify project if it doesn't exist
 * 3. Pulls the backend configuration if it exists
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
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
 * Checks if AWS credentials are configured
 */
function checkAwsCredentials() {
  log('Checking AWS credentials...');

  const awsCredentialsPath = path.join(os.homedir(), '.aws', 'credentials');

  if (!fs.existsSync(awsCredentialsPath)) {
    log('AWS credentials not found. Please configure your AWS credentials.', 'error');
    log('Run "aws configure" to set up your credentials.', 'info');
    process.exit(1);
  }

  try {
    // Try with the AmplifyUser profile first
    const result = execute('aws sts get-caller-identity --profile AmplifyUser', { silent: true });
    if (result) {
      log('AWS credentials are configured correctly using the AmplifyUser profile.', 'success');
      // Set the AWS_PROFILE environment variable for subsequent commands
      process.env.AWS_PROFILE = 'AmplifyUser';
      return true;
    }
  } catch (error) {
    try {
      // Try with the default profile as a fallback
      const defaultResult = execute('aws sts get-caller-identity', { silent: true });
      if (defaultResult) {
        log('AWS credentials are configured correctly using the default profile.', 'success');
        return true;
      }
    } catch (defaultError) {
      log('AWS credentials are invalid or expired.', 'error');
      log('Make sure your credentials in ~/.aws/credentials are valid.', 'info');
      log('You can run "aws configure" or edit the file directly.', 'info');
      process.exit(1);
    }
  }

  return false;
}

/**
 * Prompts the user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Initializes a new Amplify project
 */
async function initAmplify() {
  log('Initializing Amplify project...', 'info');

  // Check if Amplify is already initialized
  if (fs.existsSync(path.join(process.cwd(), '.amplify'))) {
    log('Amplify project already initialized.', 'warning');
    const answer = await prompt('Do you want to start the sandbox to use the existing backend configuration? (y/n): ');

    if (answer.toLowerCase() === 'y') {
      log('Starting Amplify sandbox...', 'info');
      execute('npx ampx sandbox --once');
      log('Sandbox started and configuration generated.', 'success');
    }

    return;
  }

  // Get project name
  const packageJson = require(path.join(process.cwd(), 'package.json'));
  const defaultProjectName = packageJson.name || 'amplify-nextjs-app';

  const projectName = await prompt(`Enter a name for your Amplify project (${defaultProjectName}): `);
  const finalProjectName = projectName || defaultProjectName;

  // Initialize Amplify
  log(`Initializing Amplify project with name: ${finalProjectName}`, 'info');
  execute(`npx ampx init --name ${finalProjectName}`);

  log('Amplify project initialized successfully.', 'success');
  log('Starting Amplify sandbox...', 'info');
  execute('npx ampx sandbox');
}

/**
 * Main function
 */
async function main() {
  log('Setting up Amplify project...', 'info');

  // Step 1: Check AWS credentials
  checkAwsCredentials();

  // Step 2: Initialize Amplify
  await initAmplify();

  log('Amplify project setup complete!', 'success');
  log('You can now run "npm run dev:local" to start the development server.', 'info');
}

// Create scripts directory if it doesn't exist
if (!fs.existsSync(path.dirname(__filename))) {
  fs.mkdirSync(path.dirname(__filename), { recursive: true });
}

// Run the main function
main();
