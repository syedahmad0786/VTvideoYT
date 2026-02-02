/**
 * Execute n8n Workflow - Standalone script
 *
 * Executes a workflow by ID using the n8n API.
 * Requires N8N_API_KEY to be set in your environment.
 *
 * Usage: node src/execute-workflow.js <workflow-id> [json-data]
 *
 * Examples:
 *   node src/execute-workflow.js abc123
 *   node src/execute-workflow.js abc123 '{"input": "value"}'
 */

import 'dotenv/config';
import { N8nClient } from './n8n-client.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Execute n8n Workflow');
    console.log('');
    console.log('Usage: node src/execute-workflow.js <workflow-id> [json-data]');
    console.log('');
    console.log('Examples:');
    console.log('  node src/execute-workflow.js abc123');
    console.log('  node src/execute-workflow.js abc123 \'{"input": "value"}\'');
    console.log('');
    console.log('To find workflow IDs, run: npm run list-workflows');
    process.exit(1);
  }

  const workflowId = args[0];
  let data = {};

  if (args[1]) {
    try {
      data = JSON.parse(args[1]);
    } catch (e) {
      console.error('Error: Invalid JSON data provided');
      console.error('Make sure to properly quote and escape your JSON');
      process.exit(1);
    }
  }

  const client = new N8nClient();

  console.log('Execute n8n Workflow');
  console.log('='.repeat(50));
  console.log(`Instance: ${client.baseUrl}`);
  console.log(`Workflow ID: ${workflowId}`);
  console.log(`Input Data: ${JSON.stringify(data)}`);
  console.log('='.repeat(50));

  try {
    // First, get workflow info
    console.log('\nFetching workflow info...');
    const workflow = await client.getWorkflow(workflowId);
    console.log(`Workflow Name: ${workflow.name}`);
    console.log(`Status: ${workflow.active ? 'Active' : 'Inactive'}`);

    // Execute the workflow
    console.log('\nExecuting workflow...');
    const result = await client.executeWorkflow(workflowId, data);

    console.log('\nExecution completed!');
    console.log('-'.repeat(50));

    if (result.data) {
      console.log('Execution ID:', result.data.id || 'N/A');
      console.log('Status:', result.data.status || 'N/A');

      if (result.data.data) {
        console.log('\nOutput Data:');
        console.log(JSON.stringify(result.data.data, null, 2));
      }
    } else {
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('\nError:', error.message);

    if (error.message.includes('API key')) {
      console.log('\nTo use this feature, you need to:');
      console.log('1. Generate an API key in n8n (Settings > API)');
      console.log('2. Add it to your .env file: N8N_API_KEY=your-key-here');
    }

    process.exit(1);
  }
}

main();
