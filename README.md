# AWS Amplify Next.js (App Router) Starter Template

This repository provides a starter template for creating applications using Next.js (App Router) and AWS Amplify Gen2, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational Next.js application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.
- **Local Development**: Seamless local development with Amplify Sandbox.
- **Deployment Automation**: Scripts for easy deployment to AWS.
- **Data Synchronization**: Unified development workflow with data syncing between local and deployed environments.

## Getting Started

### Prerequisites

- Node.js 18 or later
- AWS Account
- AWS CLI configured with your credentials
- Amplify CLI installed globally (`npm install -g @aws-amplify/cli`)

### AWS Credentials Setup

This project uses AWS credentials for authentication with AWS services. Follow these steps to set up your credentials securely:

1. Configure your AWS CLI with the appropriate profile:
   ```bash
   aws configure --profile AmplifyUser
   ```

2. Enter your AWS Access Key ID and Secret Access Key when prompted
3. Set the default region to `us-east-1` (or your preferred region)
4. Set the output format to `json`

**IMPORTANT: Never commit AWS credentials to your repository. Always use AWS profiles or environment variables.**

### Installation

1. Clone this repository
2. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Update the `.env.local` file with your AWS profile name and Amplify app details

4. Run the setup script:
   ```bash
   npm run setup
   ```

   This script will:
   - Check if your AWS credentials are configured
   - Set up the environment files if they don't exist
   - Install dependencies if needed

5. Initialize your Amplify project:
   ```bash
   npm run init
   ```

   This script will:
   - Check if your AWS credentials are configured
   - Initialize a new Amplify project if it doesn't exist
   - Pull the backend configuration if it exists

### Local Development

This project includes scripts to make local development with AWS Amplify Gen2 seamless:

```bash
# Start the local development server with Amplify Sandbox
npm run dev:local

# Start only the Amplify Sandbox
npm run sandbox

# Synchronize data between local and cloud environments
npm run sync-data
```

The `dev:local` script starts both the Next.js development server and the Amplify Sandbox in parallel, allowing you to develop with a fully functional local backend.

The `sync-data` script provides a way to synchronize data between your local sandbox and the cloud environment, ensuring that your development and production data stay in sync. It supports:

- **One-way sync (local to cloud)**: Push your local changes to the cloud
- **One-way sync (cloud to local)**: Pull cloud data to your local environment
- **Two-way sync (merge)**: Intelligently merge data from both environments, resolving conflicts based on update timestamps

### Deployment

This project includes scripts to automate the deployment process:

```bash
# Deploy both backend and frontend
npm run deploy

# Deploy only the backend
npm run deploy:backend

# Deploy only the frontend
npm run deploy:frontend

# Deploy everything and commit/push changes to Git
npm run deploy:all "Your commit message"
```

The `deploy:all` script will:
1. Build the application
2. Deploy the backend to AWS
3. Deploy the frontend to AWS Amplify
4. Commit and push all changes to Git

## Project Structure

```
├── amplify/              # Amplify backend configuration
│   ├── auth/             # Authentication configuration
│   ├── data/             # Data models and schema
│   ├── backend.ts        # Backend definition
│   └── config.ts         # Amplify configuration
├── app/                  # Next.js app directory
│   ├── page.tsx          # Main application page
│   └── layout.tsx        # Root layout component
├── scripts/              # Deployment and utility scripts
└── .env.local.example    # Environment variables template
```

## Best Practices

### Local Development

- Always use `npm run dev:local` for local development to ensure your backend is running.
- If you make changes to the backend, use `npm run sandbox:push` to update your local sandbox.

### Deployment

- Use `npm run deploy:all` with a descriptive commit message for comprehensive deployments.
- For quick iterations on just the frontend, use `npm run deploy:frontend`.

## Unified Development Workflow

This project implements a unified development workflow that ensures consistency between local and deployed environments:

### Automatic Mode Detection

The application automatically detects whether it's connected to the backend or running in local mode:

1. When the backend is available, it uses the cloud database for all operations
2. When the backend is unavailable, it seamlessly switches to local storage
3. You can manually toggle between modes for testing purposes

### Data Synchronization

The `sync-data` script provides powerful data synchronization capabilities:

```bash
# Run the data synchronization tool
npm run sync-data
```

This tool will prompt you to choose a synchronization direction:
1. **Local to Cloud**: Push your local changes to the cloud
2. **Cloud to Local**: Pull cloud data to your local environment
3. **Two-way Sync**: Merge data from both environments, resolving conflicts based on timestamps

### Local Storage Simulation

When working in local mode, the application uses browser localStorage to persist data. The `sync-data` tool can export this data to a file and import it back, allowing you to:

1. Back up your local development data
2. Share local development data with team members
3. Restore local development data after clearing browser storage

## Troubleshooting

### Backend Connection Issues

If you encounter issues connecting to the backend:

1. Ensure the Amplify Sandbox is running (`npm run sandbox`)
2. Check your `.env.local` file for correct configuration
3. Verify your AWS credentials are properly set up
4. Check the browser console for specific error messages

### Deployment Failures

If deployment fails:

1. Check the error messages in the console
2. Verify your AWS credentials have the necessary permissions
3. Ensure your Amplify app is properly configured

## Security

### Credentials Management

This project follows AWS security best practices for credentials management:

1. **Use AWS Profiles**: Always use AWS profiles instead of hardcoding credentials
2. **Environment Variables**: Store sensitive information in environment variables
3. **Gitignore**: All environment files (`.env.*`) are excluded from Git
4. **Example Files**: Only commit example environment files without real credentials
5. **AWS IAM Best Practices**: Follow the principle of least privilege when creating IAM users

### Local Development Security

When developing locally:

1. **Use Sandbox Mode**: The Amplify Sandbox creates isolated resources for development
2. **Local Storage**: Sensitive data in local storage is only used for development
3. **API Keys**: Development API keys have limited permissions and expiration times

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.