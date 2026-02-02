/**
 * List n8n Workflows - Standalone script
 *
 * Lists all workflows from your n8n instance using the API.
 * Requires N8N_API_KEY to be set in your environment.
 *
 * Usage: node src/list-workflows.js [--active] [--inactive]
 */

import 'dotenv/config';
import { N8nClient } from './n8n-client.js';

async function main() {
  const args = process.argv.slice(2);

  let activeFilter = null;
  if (args.includes('--active')) {
    activeFilter = true;
  } else if (args.includes('--inactive')) {
    activeFilter = false;
  }

  const client = new N8nClient();

  console.log('n8n Workflow List');
  console.log('='.repeat(50));
  console.log(`Instance: ${client.baseUrl}`);
  if (activeFilter !== null) {
    console.log(`Filter: ${activeFilter ? 'Active only' : 'Inactive only'}`);
  }
  console.log('='.repeat(50));

  try {
    const result = await client.listWorkflows(activeFilter);

    if (!result.data || result.data.length === 0) {
      console.log('\nNo workflows found.');
      return;
    }

    console.log(`\nFound ${result.data.length} workflow(s):\n`);

    // Group by active status
    const activeWorkflows = result.data.filter(w => w.active);
    const inactiveWorkflows = result.data.filter(w => !w.active);

    if (activeWorkflows.length > 0) {
      console.log('ACTIVE WORKFLOWS:');
      console.log('-'.repeat(40));
      activeWorkflows.forEach(workflow => {
        printWorkflow(workflow);
      });
    }

    if (inactiveWorkflows.length > 0) {
      if (activeWorkflows.length > 0) console.log('');
      console.log('INACTIVE WORKFLOWS:');
      console.log('-'.repeat(40));
      inactiveWorkflows.forEach(workflow => {
        printWorkflow(workflow);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${result.data.length} | Active: ${activeWorkflows.length} | Inactive: ${inactiveWorkflows.length}`);

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

function printWorkflow(workflow) {
  console.log(`  • ${workflow.name}`);
  console.log(`    ID: ${workflow.id}`);
  if (workflow.tags && workflow.tags.length > 0) {
    console.log(`    Tags: ${workflow.tags.map(t => t.name).join(', ')}`);
  }
  console.log('');
}

main();
