/**
 * Production build script for AWS Amplify Gen2 Next.js applications
 * 
 * This script:
 * 1. Creates a temporary build directory
 * 2. Copies only the necessary files for the frontend build
 * 3. Runs the Next.js build in the temporary directory
 * 4. Copies the build output back to the main directory
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
 * Creates a temporary build directory
 */
function createTempBuildDir() {
  const tempDir = path.join(process.cwd(), '.temp-build');
  
  // Remove the directory if it already exists
  if (fs.existsSync(tempDir)) {
    log('Removing existing temporary build directory...', 'info');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Create the directory
  log('Creating temporary build directory...', 'info');
  fs.mkdirSync(tempDir, { recursive: true });
  
  return tempDir;
}

/**
 * Copies necessary files to the temporary build directory
 */
function copyFilesToTempDir(tempDir) {
  log('Copying files to temporary build directory...', 'info');
  
  // Create necessary directories
  fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'public'), { recursive: true });
  
  // Copy package.json and package-lock.json
  fs.copyFileSync(
    path.join(process.cwd(), 'package.json'),
    path.join(tempDir, 'package.json')
  );
  
  if (fs.existsSync(path.join(process.cwd(), 'package-lock.json'))) {
    fs.copyFileSync(
      path.join(process.cwd(), 'package-lock.json'),
      path.join(tempDir, 'package-lock.json')
    );
  }
  
  // Copy next.config.js
  fs.copyFileSync(
    path.join(process.cwd(), 'next.config.js'),
    path.join(tempDir, 'next.config.js')
  );
  
  // Copy tsconfig.json
  if (fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
    fs.copyFileSync(
      path.join(process.cwd(), 'tsconfig.json'),
      path.join(tempDir, 'tsconfig.json')
    );
  }
  
  // Copy .env files
  if (fs.existsSync(path.join(process.cwd(), '.env'))) {
    fs.copyFileSync(
      path.join(process.cwd(), '.env'),
      path.join(tempDir, '.env')
    );
  }
  
  if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    fs.copyFileSync(
      path.join(process.cwd(), '.env.local'),
      path.join(tempDir, '.env.local')
    );
  }
  
  if (fs.existsSync(path.join(process.cwd(), '.env.production'))) {
    fs.copyFileSync(
      path.join(process.cwd(), '.env.production'),
      path.join(tempDir, '.env.production')
    );
  }
  
  // Copy app directory (excluding node_modules and .next)
  copyDirectory(
    path.join(process.cwd(), 'app'),
    path.join(tempDir, 'app'),
    ['node_modules', '.next', '.temp-build']
  );
  
  // Copy public directory
  if (fs.existsSync(path.join(process.cwd(), 'public'))) {
    copyDirectory(
      path.join(process.cwd(), 'public'),
      path.join(tempDir, 'public'),
      ['node_modules', '.next', '.temp-build']
    );
  }
  
  // Create a simplified amplify_outputs.json file
  const amplifyOutputs = {
    version: '1.0',
    api: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || '',
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
        defaultAuthMode: 'API_KEY',
        apiKey: process.env.NEXT_PUBLIC_API_KEY || ''
      }
    }
  };
  
  fs.writeFileSync(
    path.join(tempDir, 'amplify_outputs.json'),
    JSON.stringify(amplifyOutputs, null, 2)
  );
  
  log('Files copied successfully.', 'success');
}

/**
 * Recursively copies a directory
 */
function copyDirectory(source, destination, excludes = []) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  // Get all files and directories in the source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  // Copy each file and directory
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    
    // Skip excluded directories
    if (excludes.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      // Recursively copy the directory
      copyDirectory(sourcePath, destinationPath, excludes);
    } else {
      // Copy the file
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

/**
 * Builds the Next.js application in the temporary directory
 */
function buildNextApp(tempDir) {
  log('Building Next.js application...', 'info');
  
  // Change to the temporary directory
  process.chdir(tempDir);
  
  // Install dependencies
  execute('npm install --production=false');
  
  // Build the application
  execute('npx next build');
  
  log('Next.js application built successfully.', 'success');
}

/**
 * Copies the build output back to the main directory
 */
function copyBuildOutput(tempDir) {
  log('Copying build output to main directory...', 'info');
  
  const buildDir = path.join(tempDir, 'build');
  const mainBuildDir = path.join(process.cwd(), 'build');
  
  // Remove the existing build directory if it exists
  if (fs.existsSync(mainBuildDir)) {
    fs.rmSync(mainBuildDir, { recursive: true, force: true });
  }
  
  // Copy the build directory
  copyDirectory(buildDir, mainBuildDir);
  
  log('Build output copied successfully.', 'success');
}

/**
 * Cleans up the temporary build directory
 */
function cleanup(tempDir) {
  log('Cleaning up...', 'info');
  
  // Change back to the main directory
  process.chdir(process.cwd());
  
  // Remove the temporary build directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  log('Cleanup completed.', 'success');
}

/**
 * Main function
 */
function main() {
  log('Starting production build...', 'info');
  
  // Save the current working directory
  const mainDir = process.cwd();
  
  try {
    // Create a temporary build directory
    const tempDir = createTempBuildDir();
    
    // Copy necessary files to the temporary directory
    copyFilesToTempDir(tempDir);
    
    // Build the Next.js application
    buildNextApp(tempDir);
    
    // Copy the build output back to the main directory
    copyBuildOutput(tempDir);
    
    // Clean up
    cleanup(tempDir);
    
    // Change back to the main directory
    process.chdir(mainDir);
    
    log('Production build completed successfully!', 'success');
  } catch (error) {
    // Change back to the main directory
    process.chdir(mainDir);
    
    log(`Error during production build: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the main function
main();
