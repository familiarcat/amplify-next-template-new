/**
 * Local development setup script for AWS Amplify Gen2 Next.js applications
 *
 * This script:
 * 1. Checks if AWS credentials are configured
 * 2. Sets up the .env.local file if it doesn't exist
 * 3. Starts the Amplify sandbox
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
 * Sets up the .env.local file if it doesn't exist
 */
function setupEnvFile() {
  log('Setting up environment variables...');

  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.local.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log('.env.local file created from example.', 'success');
    } else {
      log('.env.local.example file not found. Creating a basic .env.local file.', 'warning');

      const envContent = `# AWS Amplify Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:20002/graphql
NEXT_PUBLIC_USER_POOL_ID=local_user_pool_id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=local_user_pool_client_id
NEXT_PUBLIC_IDENTITY_POOL_ID=local_identity_pool_id
NEXT_PUBLIC_AMPLIFY_APP_ID=local_app_id
`;

      fs.writeFileSync(envPath, envContent);
      log('Basic .env.local file created.', 'success');
    }
  } else {
    log('.env.local file already exists.', 'info');
  }
}

/**
 * Main setup function
 */
function setup() {
  log('Setting up local development environment...', 'info');

  // Step 1: Check AWS credentials
  checkAwsCredentials();

  // Step 2: Set up .env.local file
  setupEnvFile();

  // Step 3: Install dependencies if needed
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    log('Installing dependencies...', 'info');
    execute('npm install');
  }

  log('Local development environment setup complete!', 'success');
  log('You can now run "npm run dev:local" to start the development server.', 'info');
}

// Create scripts directory if it doesn't exist
if (!fs.existsSync(path.dirname(__filename))) {
  fs.mkdirSync(path.dirname(__filename), { recursive: true });
}

// Run the setup
setup();
