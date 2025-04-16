/**
 * Script to run the local development environment with the correct AWS region
 */

const { spawn } = require('child_process');
const path = require('path');

// Function to run a command
function runCommand(command, args, options = {}) {
  console.log(`Running: ${command} ${args.join(' ')}`);
  
  const env = {
    ...process.env,
    AWS_PROFILE: 'AmplifyUser',
    AWS_REGION: 'us-east-1',
    AWS_DEFAULT_REGION: 'us-east-1',
    // Use AWS profile instead of hardcoded credentials
    // Unset any conflicting variables
    AWS_ACCESS_KEY_ID: undefined,
    AWS_SECRET_ACCESS_KEY: undefined,
    AWS_SESSION_TOKEN: undefined,
  };

  return spawn(command, args, { 
    stdio: 'inherit',
    env,
    ...options
  });
}

// Start the sandbox
console.log('Starting Amplify sandbox...');
const sandbox = runCommand('ampx', ['sandbox']);

// Wait a bit for the sandbox to initialize
setTimeout(() => {
  // Start the Next.js dev server
  console.log('Starting Next.js dev server...');
  const nextDev = runCommand('next', ['dev']);

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    sandbox.kill();
    nextDev.kill();
    process.exit(0);
  });
}, 2000);

console.log('Press Ctrl+C to stop both processes');
