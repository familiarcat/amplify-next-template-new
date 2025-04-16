/**
 * Automated deployment script for AWS Amplify Gen2 Next.js applications
 *
 * This script:
 * 1. Builds the application
 * 2. Deploys the backend to AWS
 * 3. Deploys the frontend to AWS Amplify
 * 4. Commits and pushes all changes to Git
 */

const { execSync } = require('child_process');
const simpleGit = require('simple-git');
const git = simpleGit();
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
    // Add AWS_PROFILE environment variable if not already in the command
    if (!command.includes('--profile') && !options.env?.AWS_PROFILE) {
      options.env = {
        ...process.env,
        ...options.env,
        AWS_PROFILE: 'AmplifyUser'
      };
      log(`Using AWS profile: AmplifyUser`);
    }

    log(`Executing: ${command}`);
    return execSync(command, {
      stdio: 'inherit',
      ...options
    });
  } catch (error) {
    log(`Command failed: ${command}`, 'error');
    log(error.message, 'error');
    process.exit(1);
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  try {
    // Check if we have uncommitted changes
    const status = await git.status();
    const hasChanges = status.files.length > 0;

    if (hasChanges) {
      log('You have uncommitted changes. These will be included in the deployment.', 'warning');
      const commitMessage = process.argv[2] || `Automated deployment ${new Date().toISOString()}`;

      // Step 1: Build the application
      log('Building the application...', 'info');
      execute('npm run build');

      // Step 2: Deploy the backend
      log('Deploying the backend...', 'info');
      execute('npx ampx backend deploy');

      // Step 3: Deploy the frontend
      log('Deploying the frontend...', 'info');
      execute('npx ampx app deploy');

      // Step 4: Commit all changes
      log('Committing changes...', 'info');
      await git.add('.');
      await git.commit(commitMessage);

      // Step 5: Push to remote
      log('Pushing to remote repository...', 'info');
      await git.push();

      log('Deployment completed successfully!', 'success');
    } else {
      log('No changes detected. Proceeding with deployment...', 'info');

      // Step 1: Build the application
      log('Building the application...', 'info');
      execute('npm run build');

      // Step 2: Deploy the backend
      log('Deploying the backend...', 'info');
      execute('npx ampx backend deploy');

      // Step 3: Deploy the frontend
      log('Deploying the frontend...', 'info');
      execute('npx ampx app deploy');

      log('Deployment completed successfully!', 'success');
    }
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Create scripts directory if it doesn't exist
if (!fs.existsSync(path.dirname(__filename))) {
  fs.mkdirSync(path.dirname(__filename), { recursive: true });
}

// Run the deployment
deploy();
