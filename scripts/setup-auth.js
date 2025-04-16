/**
 * Script to automate the creation of a Cognito User Pool for local development
 * This script will:
 * 1. Create a Cognito User Pool if it doesn't exist
 * 2. Create a User Pool Client
 * 3. Create an Identity Pool
 * 4. Update the .env.local file with the correct values
 */

const { CognitoIdentityProviderClient, CreateUserPoolCommand, CreateUserPoolClientCommand, DescribeUserPoolCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { CognitoIdentityClient, CreateIdentityPoolCommand } = require('@aws-sdk/client-cognito-identity');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
 * Updates the .env.local file with the correct values
 */
function updateEnvFile(userPoolId, userPoolClientId, identityPoolId) {
  const envFilePath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envFilePath)) {
    log('.env.local file not found. Creating a new one.', 'warning');
    fs.writeFileSync(envFilePath, '# AWS Amplify Configuration for local development with sandbox\n');
  }

  let envContent = fs.readFileSync(envFilePath, 'utf8');

  // Update or add the User Pool ID
  if (envContent.includes('NEXT_PUBLIC_USER_POOL_ID=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_USER_POOL_ID=.*/, `NEXT_PUBLIC_USER_POOL_ID=${userPoolId}`);
  } else {
    envContent += `\nNEXT_PUBLIC_USER_POOL_ID=${userPoolId}`;
  }

  // Update or add the User Pool Client ID
  if (envContent.includes('NEXT_PUBLIC_USER_POOL_CLIENT_ID=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_USER_POOL_CLIENT_ID=.*/, `NEXT_PUBLIC_USER_POOL_CLIENT_ID=${userPoolClientId}`);
  } else {
    envContent += `\nNEXT_PUBLIC_USER_POOL_CLIENT_ID=${userPoolClientId}`;
  }

  // Update or add the Identity Pool ID
  if (envContent.includes('NEXT_PUBLIC_IDENTITY_POOL_ID=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_IDENTITY_POOL_ID=.*/, `NEXT_PUBLIC_IDENTITY_POOL_ID=${identityPoolId}`);
  } else {
    envContent += `\nNEXT_PUBLIC_IDENTITY_POOL_ID=${identityPoolId}`;
  }

  fs.writeFileSync(envFilePath, envContent);
  log('.env.local file updated with Cognito configuration.', 'success');
}

/**
 * Creates a Cognito User Pool
 */
async function createUserPool() {
  try {
    // Force the region to be us-east-1
    const region = 'us-east-1';
    const appName = 'AmplifyGen2App';

    log(`Creating Cognito User Pool in region ${region}...`);

    const cognitoClient = new CognitoIdentityProviderClient({
      region,
    });

    // Check if a user pool with the same name already exists
    try {
      const listPoolsCommand = `aws cognito-idp list-user-pools --max-results 60 --profile AmplifyUser --region ${region}`;
      const result = execute(listPoolsCommand, { silent: true });
      const userPools = JSON.parse(result.toString()).UserPools;

      const existingPool = userPools.find(pool => pool.Name === appName);
      if (existingPool) {
        log(`User Pool ${appName} already exists with ID: ${existingPool.Id}`, 'warning');

        // Get the user pool details
        const describeCommand = new DescribeUserPoolCommand({
          UserPoolId: existingPool.Id
        });
        const userPoolDetails = await cognitoClient.send(describeCommand);

        // Check if there's an existing client
        const listClientsCommand = `aws cognito-idp list-user-pool-clients --user-pool-id ${existingPool.Id} --profile AmplifyUser --region ${region}`;
        const clientsResult = execute(listClientsCommand, { silent: true });
        const clients = JSON.parse(clientsResult.toString()).UserPoolClients;

        if (clients && clients.length > 0) {
          const clientId = clients[0].ClientId;
          log(`Using existing User Pool Client: ${clientId}`, 'info');

          // Check if there's an existing identity pool
          const listIdentityPoolsCommand = `aws cognito-identity list-identity-pools --max-results 60 --profile AmplifyUser --region ${region}`;
          const identityPoolsResult = execute(listIdentityPoolsCommand, { silent: true });
          const identityPools = JSON.parse(identityPoolsResult.toString()).IdentityPools;

          const existingIdentityPool = identityPools.find(pool => pool.IdentityPoolName.includes(appName));
          if (existingIdentityPool) {
            log(`Using existing Identity Pool: ${existingIdentityPool.IdentityPoolId}`, 'info');

            // Update the .env.local file
            updateEnvFile(existingPool.Id, clientId, existingIdentityPool.IdentityPoolId);

            return {
              userPoolId: existingPool.Id,
              userPoolClientId: clientId,
              identityPoolId: existingIdentityPool.IdentityPoolId
            };
          }
        }

        // If we get here, we need to create a new client and identity pool
        return createResourcesForExistingPool(existingPool.Id, appName, region, cognitoClient);
      }
    } catch (error) {
      log(`Error checking existing user pools: ${error.message}`, 'warning');
      // Continue with creation
    }

    // Create a new user pool
    const createPoolCommand = new CreateUserPoolCommand({
      PoolName: appName,
      AutoVerifiedAttributes: ['email'],
      UsernameAttributes: ['email'],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: false
        }
      },
      Schema: [
        {
          Name: 'email',
          AttributeDataType: 'String',
          Mutable: true,
          Required: true
        },
        {
          Name: 'name',
          AttributeDataType: 'String',
          Mutable: true,
          Required: false
        }
      ]
    });

    const userPoolResult = await cognitoClient.send(createPoolCommand);
    const userPoolId = userPoolResult.UserPool.Id;

    log(`User Pool created with ID: ${userPoolId}`, 'success');

    // Create a user pool client
    const createClientCommand = new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: `${appName}Client`,
      GenerateSecret: false,
      ExplicitAuthFlows: [
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_PASSWORD_AUTH'
      ]
    });

    const clientResult = await cognitoClient.send(createClientCommand);
    const userPoolClientId = clientResult.UserPoolClient.ClientId;

    log(`User Pool Client created with ID: ${userPoolClientId}`, 'success');

    // Create an identity pool
    const identityClient = new CognitoIdentityClient({
      region
    });

    const createIdentityPoolCommand = new CreateIdentityPoolCommand({
      IdentityPoolName: `${appName}IdentityPool`,
      AllowUnauthenticatedIdentities: true,
      CognitoIdentityProviders: [
        {
          ProviderName: `cognito-idp.${region}.amazonaws.com/${userPoolId}`,
          ClientId: userPoolClientId
        }
      ]
    });

    const identityPoolResult = await identityClient.send(createIdentityPoolCommand);
    const identityPoolId = identityPoolResult.IdentityPoolId;

    log(`Identity Pool created with ID: ${identityPoolId}`, 'success');

    // Set up identity pool roles
    const setIdentityPoolRolesCommand = `aws cognito-identity set-identity-pool-roles --identity-pool-id ${identityPoolId} --roles authenticated=arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/Cognito_${appName}IdentityPoolAuth_Role,unauthenticated=arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/Cognito_${appName}IdentityPoolUnauth_Role --profile AmplifyUser --region ${region}`;

    try {
      execute(setIdentityPoolRolesCommand);
      log('Identity Pool roles set up successfully.', 'success');
    } catch (error) {
      log(`Warning: Could not set identity pool roles. You may need to set them manually in the AWS Console.`, 'warning');
    }

    // Update the .env.local file
    updateEnvFile(userPoolId, userPoolClientId, identityPoolId);

    return {
      userPoolId,
      userPoolClientId,
      identityPoolId
    };
  } catch (error) {
    log(`Error creating Cognito resources: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Creates a User Pool Client and Identity Pool for an existing User Pool
 */
async function createResourcesForExistingPool(userPoolId, appName, region, cognitoClient) {
  // Create a user pool client
  const createClientCommand = new CreateUserPoolClientCommand({
    UserPoolId: userPoolId,
    ClientName: `${appName}Client`,
    GenerateSecret: false,
    ExplicitAuthFlows: [
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH',
      'ALLOW_USER_PASSWORD_AUTH'
    ]
  });

  const clientResult = await cognitoClient.send(createClientCommand);
  const userPoolClientId = clientResult.UserPoolClient.ClientId;

  log(`User Pool Client created with ID: ${userPoolClientId}`, 'success');

  // Create an identity pool
  const identityClient = new CognitoIdentityClient({
    region
  });

  const createIdentityPoolCommand = new CreateIdentityPoolCommand({
    IdentityPoolName: `${appName}IdentityPool`,
    AllowUnauthenticatedIdentities: true,
    CognitoIdentityProviders: [
      {
        ProviderName: `cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        ClientId: userPoolClientId
      }
    ]
  });

  const identityPoolResult = await identityClient.send(createIdentityPoolCommand);
  const identityPoolId = identityPoolResult.IdentityPoolId;

  log(`Identity Pool created with ID: ${identityPoolId}`, 'success');

  // Update the .env.local file
  updateEnvFile(userPoolId, userPoolClientId, identityPoolId);

  return {
    userPoolId,
    userPoolClientId,
    identityPoolId
  };
}

/**
 * Main function
 */
async function main() {
  log('Setting up Cognito User Pool for local development...', 'info');

  try {
    // Get AWS account ID
    const getAccountIdCommand = `aws sts get-caller-identity --profile AmplifyUser --query "Account" --output text`;
    const accountId = execute(getAccountIdCommand, { silent: true }).toString().trim();
    process.env.AWS_ACCOUNT_ID = accountId;

    log(`AWS Account ID: ${accountId}`, 'info');

    // Create Cognito resources
    const cognitoResources = await createUserPool();

    log('Cognito setup completed successfully!', 'success');
    log(`User Pool ID: ${cognitoResources.userPoolId}`, 'info');
    log(`User Pool Client ID: ${cognitoResources.userPoolClientId}`, 'info');
    log(`Identity Pool ID: ${cognitoResources.identityPoolId}`, 'info');

    // Update the amplify_outputs.json file
    const outputsPath = path.join(process.cwd(), 'amplify_outputs.json');

    if (fs.existsSync(outputsPath)) {
      let outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));

      // Update the auth section
      if (!outputs.auth) {
        outputs.auth = {};
      }

      outputs.auth.userPoolId = cognitoResources.userPoolId;
      outputs.auth.userPoolClientId = cognitoResources.userPoolClientId;
      outputs.auth.identityPoolId = cognitoResources.identityPoolId;

      fs.writeFileSync(outputsPath, JSON.stringify(outputs, null, 2));
      log('amplify_outputs.json file updated with Cognito configuration.', 'success');
    } else {
      log('amplify_outputs.json file not found. Creating a new one.', 'warning');

      const outputs = {
        auth: {
          userPoolId: cognitoResources.userPoolId,
          userPoolClientId: cognitoResources.userPoolClientId,
          identityPoolId: cognitoResources.identityPoolId,
          region: process.env.AWS_REGION || 'us-east-2'
        },
        api: {
          GraphQL: {
            endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:20002/graphql',
            region: process.env.AWS_REGION || 'us-east-2',
            defaultAuthMode: 'apiKey',
            apiKey: process.env.NEXT_PUBLIC_API_KEY || 'local-api-key'
          }
        }
      };

      fs.writeFileSync(outputsPath, JSON.stringify(outputs, null, 2));
      log('amplify_outputs.json file created with Cognito configuration.', 'success');
    }

  } catch (error) {
    log(`Error setting up Cognito: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Create scripts directory if it doesn't exist
if (!fs.existsSync(path.dirname(__filename))) {
  fs.mkdirSync(path.dirname(__filename), { recursive: true });
}

// Run the main function
main();
