/**
 * Data synchronization script for AWS Amplify Gen2 Next.js applications
 *
 * This script:
 * 1. Exports data from the local sandbox or cloud environment
 * 2. Imports data to the target environment (local or cloud)
 * 3. Provides options for selective data synchronization
 * 4. Syncs data between localStorage and DynamoDB
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

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
 * Get DynamoDB client
 */
function getDynamoDBClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });

  return DynamoDBDocumentClient.from(client);
}

/**
 * Get the DynamoDB table name for a model
 */
async function getTableName(modelName) {
  try {
    // Run the amplify sandbox command to get the outputs
    const result = execute('npx ampx sandbox --outputs', { silent: true });
    const outputs = JSON.parse(result.toString());

    // Find the table name for the model
    const dataOutput = outputs.data;
    if (dataOutput && dataOutput.tables && dataOutput.tables[modelName]) {
      return dataOutput.tables[modelName].tableName;
    }

    throw new Error(`Table name for model ${modelName} not found in outputs`);
  } catch (error) {
    log(`Error getting table name: ${error.message}`, 'error');
    // Fallback to a default naming convention
    return `Todo-${process.env.AMPLIFY_APP_ID || 'local'}`;
  }
}

/**
 * Export data from DynamoDB
 */
async function exportFromDynamoDB(modelName) {
  try {
    const tableName = await getTableName(modelName);
    const client = getDynamoDBClient();

    log(`Scanning table ${tableName}...`, 'info');

    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);
    return response.Items || [];
  } catch (error) {
    log(`Error exporting from DynamoDB: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Import data to DynamoDB
 */
async function importToDynamoDB(modelName, items) {
  try {
    const tableName = await getTableName(modelName);
    const client = getDynamoDBClient();

    log(`Importing ${items.length} items to table ${tableName}...`, 'info');

    // Use BatchWrite for multiple items
    if (items.length > 0) {
      // Split items into chunks of 25 (DynamoDB batch write limit)
      const chunks = [];
      for (let i = 0; i < items.length; i += 25) {
        chunks.push(items.slice(i, i + 25));
      }

      for (const chunk of chunks) {
        const command = new BatchWriteCommand({
          RequestItems: {
            [tableName]: chunk.map(item => ({
              PutRequest: {
                Item: item,
              },
            })),
          },
        });

        await client.send(command);
      }
    }

    log(`Successfully imported ${items.length} items to DynamoDB`, 'success');
  } catch (error) {
    log(`Error importing to DynamoDB: ${error.message}`, 'error');
  }
}

/**
 * Export data from localStorage
 */
async function exportFromLocalStorage() {
  try {
    // Since we can't directly access localStorage from Node.js,
    // we'll read from a file that simulates localStorage
    const localStoragePath = path.join(process.cwd(), 'local-storage.json');

    if (fs.existsSync(localStoragePath)) {
      const data = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
      return data.localTodos || [];
    }

    log('No local storage data found', 'warning');
    return [];
  } catch (error) {
    log(`Error exporting from localStorage: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Import data to localStorage
 */
async function importToLocalStorage(items) {
  try {
    const localStoragePath = path.join(process.cwd(), 'local-storage.json');

    // Create a structure that mimics localStorage
    const data = {
      localTodos: items,
    };

    fs.writeFileSync(localStoragePath, JSON.stringify(data, null, 2));
    log(`Successfully imported ${items.length} items to localStorage simulation`, 'success');
    log(`To use this data in your app, copy the contents of local-storage.json to your browser's localStorage`, 'info');
  } catch (error) {
    log(`Error importing to localStorage: ${error.message}`, 'error');
  }
}

/**
 * Exports data from the source environment
 */
async function exportData(source) {
  log(`Exporting data from ${source} environment...`, 'info');

  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data-export');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFile = path.join(dataDir, `${source}-export-${timestamp}.json`);

  let data;
  if (source === 'local') {
    // Export from local storage
    log('Exporting data from local storage...', 'info');
    data = await exportFromLocalStorage();
  } else {
    // Export from cloud environment (DynamoDB)
    log('Exporting data from DynamoDB...', 'info');
    data = await exportFromDynamoDB('Todo');
  }

  // Write the data to a file
  const exportData = {
    timestamp,
    source,
    data,
  };

  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  log(`Data exported to ${exportFile}`, 'success');
  return exportFile;
}

/**
 * Imports data to the target environment
 */
async function importData(target, exportFile) {
  log(`Importing data to ${target} environment...`, 'info');

  if (!fs.existsSync(exportFile)) {
    log(`Export file ${exportFile} not found.`, 'error');
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
  const items = exportData.data;

  if (target === 'local') {
    // Import to local storage
    log('Importing data to local storage...', 'info');
    await importToLocalStorage(items);
  } else {
    // Import to cloud environment (DynamoDB)
    log('Importing data to DynamoDB...', 'info');
    await importToDynamoDB('Todo', items);
  }

  log(`Data imported to ${target} environment.`, 'success');
}

/**
 * Main function
 */
async function main() {
  log('Data Synchronization Tool', 'info');
  log('------------------------', 'info');

  // Get synchronization direction
  log('Select synchronization direction:');
  log('1. Local to Cloud (push)');
  log('2. Cloud to Local (pull)');
  log('3. Two-way sync (merge)');

  const direction = await prompt('Enter your choice (1, 2, or 3): ');

  if (direction === '1') {
    // Local to Cloud
    const exportFile = await exportData('local');
    await importData('cloud', exportFile);
  } else if (direction === '2') {
    // Cloud to Local
    const exportFile = await exportData('cloud');
    await importData('local', exportFile);
  } else if (direction === '3') {
    // Two-way sync
    log('Performing two-way sync...', 'info');

    // Export from both environments
    const localExportFile = await exportData('local');
    const cloudExportFile = await exportData('cloud');

    // Read the exported data
    const localData = JSON.parse(fs.readFileSync(localExportFile, 'utf8')).data;
    const cloudData = JSON.parse(fs.readFileSync(cloudExportFile, 'utf8')).data;

    // Merge the data (simple approach: use a Map with ID as key)
    const mergedData = new Map();

    // Add all cloud data
    cloudData.forEach(item => {
      mergedData.set(item.id, item);
    });

    // Add or update with local data
    localData.forEach(item => {
      // If the item exists in both, use the one with the most recent updatedAt
      if (mergedData.has(item.id)) {
        const cloudItem = mergedData.get(item.id);
        const cloudUpdatedAt = new Date(cloudItem.updatedAt).getTime();
        const localUpdatedAt = new Date(item.updatedAt).getTime();

        if (localUpdatedAt > cloudUpdatedAt) {
          mergedData.set(item.id, item);
        }
      } else {
        mergedData.set(item.id, item);
      }
    });

    // Convert the Map back to an array
    const mergedItems = Array.from(mergedData.values());

    // Write the merged data to a file
    const mergedFile = path.join(path.dirname(localExportFile), `merged-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(mergedFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'merged',
      data: mergedItems,
    }, null, 2));

    // Import the merged data to both environments
    await importData('local', mergedFile);
    await importData('cloud', mergedFile);

    log('Two-way sync completed successfully!', 'success');
  } else {
    log('Invalid choice. Please enter 1, 2, or 3.', 'error');
    process.exit(1);
  }

  log('Data synchronization completed successfully!', 'success');
}

// Create scripts directory if it doesn't exist
if (!fs.existsSync(path.dirname(__filename))) {
  fs.mkdirSync(path.dirname(__filename), { recursive: true });
}

// Run the main function
main();
