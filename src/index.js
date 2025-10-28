import { EC2Client, StopInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure AWS EC2 Client
const ec2Client = new EC2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Load instance configuration
const configPath = join(__dirname, 'config.json');
const configData = JSON.parse(readFileSync(configPath, 'utf8'));

// Logger utility
const logger = {
  info: (msg) => console.log(`[INFO]    ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
  warning: (msg) => console.log(`[WARNING] ${msg}`),
  error: (msg) => console.error(`[ERROR]   ${msg}`),
  data: (msg) => console.log(`[DATA]    ${msg}`),
};

async function getInstanceDetails(instanceIds) {
  try {
    const command = new DescribeInstancesCommand({
      InstanceIds: instanceIds,
    });
    const response = await ec2Client.send(command);

    const instances = [];
    response.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        instances.push({
          id: instance.InstanceId,
          state: instance.State.Name,
          name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'N/A',
          ip: instance.PublicIpAddress || instance.PrivateIpAddress || 'N/A',
        });
      });
    });

    return instances;
  } catch (error) {
    logger.error(`Failed to fetch instance details: ${error.message}`);
    return [];
  }
}

async function checkStatus(instanceIds) {
  if (!instanceIds || instanceIds.length === 0) {
    logger.warning('No instances to check.');
    return;
  }

  logger.info(`Checking status of ${instanceIds.length} instance(s)...`);
  console.log('');

  const instances = await getInstanceDetails(instanceIds);

  if (instances.length === 0) {
    logger.warning('No instances found or error occurred.');
    return;
  }

  console.log('Instance Status:');
  console.log('─'.repeat(100));
  console.log(`${'INSTANCE ID'.padEnd(22)} | ${'NAME'.padEnd(27)} | ${'IP ADDRESS'.padEnd(15)} | STATUS`);
  console.log('─'.repeat(100));

  instances.forEach(instance => {
    console.log(`${instance.id.padEnd(22)} | ${instance.name.padEnd(27)} | ${instance.ip.padEnd(15)} | ${instance.state}`);
  });
  console.log('─'.repeat(100));
}

async function stopInstances(instanceIds) {
  if (!instanceIds || instanceIds.length === 0) {
    logger.warning('No instances to stop.');
    return;
  }

  logger.info(`Attempting to stop ${instanceIds.length} instance(s)...`);

  // Get instance details before stopping
  const instances = await getInstanceDetails(instanceIds);

  console.log('\nCurrent instance state:');
  instances.forEach(instance => {
    logger.data(`${instance.id} (${instance.name}) - State: ${instance.state}`);
  });

  // Filter out already stopped instances
  const runningInstances = instances.filter(i => i.state === 'running').map(i => i.id);

  if (runningInstances.length === 0) {
    console.log('');
    logger.success('All instances are already stopped or in a stopping state. No action needed.');
    return;
  }

  logger.info(`${runningInstances.length} instance(s) are running and will be stopped.`);

  try {
    const command = new StopInstancesCommand({
      InstanceIds: runningInstances,
    });

    const response = await ec2Client.send(command);

    console.log('');
    logger.success('Stop command initiated successfully');
    console.log('\nInstance state transitions:');
    response.StoppingInstances.forEach(instance => {
      logger.data(`${instance.InstanceId}: ${instance.PreviousState.Name} → ${instance.CurrentState.Name}`);
    });
  } catch (error) {
    console.log('');
    logger.error(`Failed to stop instances: ${error.message}`);
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);

  // No arguments: stop instances from config.json
  if (args.length === 0) {
    return { action: 'stop', mode: 'config', instanceIds: configData.instances };
  }

  // --status flag: check status only
  if (args.includes('--status')) {
    const statusIndex = args.indexOf('--status');
    const instanceIds = args.slice(statusIndex + 1).filter(arg => arg.startsWith('i-'));

    if (instanceIds.length > 0) {
      return { action: 'status', mode: 'specific', instanceIds };
    }
    return { action: 'status', mode: 'config', instanceIds: configData.instances };
  }

  // --all flag: stop all instances from config
  if (args.includes('--all')) {
    return { action: 'stop', mode: 'all', instanceIds: configData.instances };
  }

  // --instances flag: stop specific instances passed as arguments
  if (args.includes('--instances')) {
    const instanceIndex = args.indexOf('--instances');
    const instanceIds = args.slice(instanceIndex + 1).filter(arg => arg.startsWith('i-'));
    return { action: 'stop', mode: 'specific', instanceIds };
  }

  // Direct instance IDs without flag
  const instanceIds = args.filter(arg => arg.startsWith('i-'));
  if (instanceIds.length > 0) {
    return { action: 'stop', mode: 'specific', instanceIds };
  }

  return { action: 'stop', mode: 'config', instanceIds: configData.instances };
}

async function main() {
  console.log('=== EC2 Shutdown Manager ===\n');

  const { action, mode, instanceIds } = parseArgs();

  if (action === 'status') {
    if (mode === 'config') {
      logger.info('Checking status of instances from config.json');
    } else {
      logger.info('Checking status of specific instances');
    }
    await checkStatus(instanceIds);
  } else {
    if (mode === 'config' || mode === 'all') {
      logger.info('Stopping instances from config.json');
    } else {
      logger.info('Stopping specific instances');
    }
    await stopInstances(instanceIds);
  }

  console.log('\n=== Operation Complete ===');
}

main();
