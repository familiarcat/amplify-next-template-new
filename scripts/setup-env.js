/**
 * Script to set up the environment variables for local development
 */

const fs = require('fs');
const path = require('path');

// Create .env.local file with the correct environment variables
const envLocalContent = `# AWS Amplify Configuration for Local Development
NEXT_PUBLIC_AWS_REGION=us-east-1
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1
AWS_PROFILE=AmplifyUser
NEXT_PUBLIC_AWS_PROFILE=AmplifyUser

# Amplify Configuration
NEXT_PUBLIC_AMPLIFY_APP_ID=d1cx19ctf00ojd
NEXT_PUBLIC_API_KEY=da2-fakeApiId123456
NEXT_PUBLIC_BUILD_MODE=development
NEXT_SKIP_AMPLIFY=false
NODE_OPTIONS=--max-old-space-size=4096
`;

// Write the .env.local file
fs.writeFileSync(path.join(process.cwd(), '.env.local'), envLocalContent);
console.log('Created .env.local file with the correct environment variables');

// Create .env.development file with the correct environment variables
const envDevContent = `# AWS Amplify Configuration for Development
NEXT_PUBLIC_AWS_REGION=us-east-1
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1
AWS_PROFILE=AmplifyUser
NEXT_PUBLIC_AWS_PROFILE=AmplifyUser

# Amplify Configuration
NEXT_PUBLIC_AMPLIFY_APP_ID=d1cx19ctf00ojd
NEXT_PUBLIC_API_KEY=da2-fakeApiId123456
NEXT_PUBLIC_BUILD_MODE=development
NEXT_SKIP_AMPLIFY=false
NODE_OPTIONS=--max-old-space-size=4096
`;

// Write the .env.development file
fs.writeFileSync(path.join(process.cwd(), '.env.development'), envDevContent);
console.log('Created .env.development file with the correct environment variables');

console.log('Environment variables set up successfully');
