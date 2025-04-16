/**
 * Custom build script for Next.js with Amplify Gen2
 * 
 * This script:
 * 1. Creates a temporary .env.local file with the necessary environment variables
 * 2. Runs the Next.js build with a modified configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  fg: {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
  }
};

// Log a message with a colored prefix
function log(message, type = 'info') {
  const prefix = {
    info: `${colors.fg.blue}[INFO]${colors.reset}`,
    success: `${colors.fg.green}[SUCCESS]${colors.reset}`,
    warning: `${colors.fg.yellow}[WARNING]${colors.reset}`,
    error: `${colors.fg.red}[ERROR]${colors.reset}`,
  };
  
  console.log(`${prefix[type]} ${message}`);
}

// Execute a shell command
function execute(command) {
  try {
    log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Command failed: ${command}`, 'error');
    log(error.message, 'error');
    return false;
  }
}

// Create a temporary .env.local file with the necessary environment variables
function createEnvFile() {
  log('Creating temporary .env.local file...');
  
  const envContent = `
# AWS Amplify Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AMPLIFY_APP_ID=d1cx19ctf00ojd
NEXT_PUBLIC_API_KEY=da2-fakeApiId123456
NEXT_PUBLIC_BUILD_MODE=production
  `.trim();
  
  fs.writeFileSync('.env.local', envContent);
  log('Temporary .env.local file created.', 'success');
}

// Run the Next.js build
function runNextBuild() {
  log('Running Next.js build...');
  
  // Set environment variables to exclude the amplify directory
  process.env.NEXT_SKIP_AMPLIFY = 'true';
  
  // Run the Next.js build
  const success = execute('npx next build');
  
  if (success) {
    log('Next.js build completed successfully.', 'success');
  } else {
    log('Next.js build failed.', 'error');
    process.exit(1);
  }
}

// Main function
function main() {
  log('Starting custom build process...');
  
  // Create the temporary .env.local file
  createEnvFile();
  
  // Run the Next.js build
  runNextBuild();
  
  log('Custom build process completed.', 'success');
}

// Run the main function
main();
