/**
 * n8n Workflow Caller - Main Entry Point
 *
 * This script demonstrates how to use the N8nClient to:
 * 1. List all workflows
 * 2. Call webhooks
 * 3. Execute workflows via API
 */

import 'dotenv/config';
import { N8nClient } from './n8n-client.js';

async function main() {
  const client = new N8nClient();

  console.log('='.repeat(50));
  console.log('n8n Workflow Caller');
  console.log('='.repeat(50));
  console.log(`Base URL: ${client.baseUrl}`);
  console.log(`API Key configured: ${client.apiKey ? 'Yes' : 'No'}`);
  console.log('='.repeat(50));

  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'list':
        await listWorkflows(client);
        break;

      case 'webhook':
        const webhookPath = args[1];
        const webhookData = args[2] ? JSON.parse(args[2]) : {};
        if (!webhookPath) {
          console.error('Usage: npm start webhook <webhook-path> [json-data]');
          process.exit(1);
        }
        await callWebhook(client, webhookPath, webhookData);
        break;

      case 'execute':
        const workflowId = args[1];
        const executeData = args[2] ? JSON.parse(args[2]) : {};
        if (!workflowId) {
          console.error('Usage: npm start execute <workflow-id> [json-data]');
          process.exit(1);
        }
        await executeWorkflow(client, workflowId, executeData);
        break;

      case 'get':
        const getWorkflowId = args[1];
        if (!getWorkflowId) {
          console.error('Usage: npm start get <workflow-id>');
          process.exit(1);
        }
        await getWorkflow(client, getWorkflowId);
        break;

      case 'executions':
        const execWorkflowId = args[1] || null;
        await getExecutions(client, execWorkflowId);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

async function listWorkflows(client) {
  console.log('\nFetching workflows...\n');
  const result = await client.listWorkflows();

  if (result.data && result.data.length > 0) {
    console.log(`Found ${result.data.length} workflow(s):\n`);
    result.data.forEach((workflow, index) => {
      console.log(`${index + 1}. ${workflow.name}`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Active: ${workflow.active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${workflow.createdAt}`);
      console.log('');
    });
  } else {
    console.log('No workflows found.');
  }
}

async function callWebhook(client, webhookPath, data) {
  console.log(`\nCalling webhook: ${webhookPath}`);
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('');

  const result = await client.callWebhook(webhookPath, data);
  console.log('\nResponse:');
  console.log(typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
}

async function executeWorkflow(client, workflowId, data) {
  console.log(`\nExecuting workflow: ${workflowId}`);
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('');

  const result = await client.executeWorkflow(workflowId, data);
  console.log('\nExecution Result:');
  console.log(JSON.stringify(result, null, 2));
}

async function getWorkflow(client, workflowId) {
  console.log(`\nFetching workflow: ${workflowId}\n`);

  const workflow = await client.getWorkflow(workflowId);
  console.log('Workflow Details:');
  console.log(`  Name: ${workflow.name}`);
  console.log(`  ID: ${workflow.id}`);
  console.log(`  Active: ${workflow.active ? 'Yes' : 'No'}`);
  console.log(`  Created: ${workflow.createdAt}`);
  console.log(`  Updated: ${workflow.updatedAt}`);
  console.log(`  Nodes: ${workflow.nodes ? workflow.nodes.length : 0}`);
}

async function getExecutions(client, workflowId) {
  console.log(`\nFetching executions${workflowId ? ` for workflow ${workflowId}` : ''}...\n`);

  const result = await client.getExecutions(workflowId);

  if (result.data && result.data.length > 0) {
    console.log(`Found ${result.data.length} execution(s):\n`);
    result.data.forEach((execution, index) => {
      console.log(`${index + 1}. Execution ID: ${execution.id}`);
      console.log(`   Workflow: ${execution.workflowId}`);
      console.log(`   Status: ${execution.status}`);
      console.log(`   Started: ${execution.startedAt}`);
      console.log(`   Finished: ${execution.stoppedAt || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('No executions found.');
  }
}

function showHelp() {
  console.log(`
Usage: npm start <command> [options]

Commands:
  list                              List all workflows
  get <workflow-id>                 Get details of a specific workflow
  webhook <path> [json-data]        Call a webhook to trigger a workflow
  execute <workflow-id> [json-data] Execute a workflow via API
  executions [workflow-id]          Get execution history
  help                              Show this help message

Examples:
  npm start list
  npm start webhook webhook/my-workflow '{"name": "test"}'
  npm start execute abc123 '{"input": "data"}'
  npm start get abc123
  npm start executions
  npm start executions abc123

Environment Variables (set in .env):
  N8N_BASE_URL     - n8n instance URL (default: http://localhost:5678)
  N8N_API_KEY      - API key for n8n API access
  `);
}

main();
