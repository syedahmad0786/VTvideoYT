/**
 * Call n8n Webhook - Standalone script
 *
 * Usage: node src/call-webhook.js <webhook-path> [json-data]
 *
 * Examples:
 *   node src/call-webhook.js webhook/my-workflow
 *   node src/call-webhook.js webhook/process-data '{"name": "test", "value": 123}'
 *   node src/call-webhook.js https://n8n.example.com/webhook/abc123 '{"key": "value"}'
 */

import 'dotenv/config';
import { N8nClient } from './n8n-client.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node src/call-webhook.js <webhook-path> [json-data]');
    console.log('');
    console.log('Examples:');
    console.log('  node src/call-webhook.js webhook/my-workflow');
    console.log('  node src/call-webhook.js webhook/process-data \'{"name": "test"}\'');
    process.exit(1);
  }

  const webhookPath = args[0];
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

  console.log('Calling n8n Webhook');
  console.log('='.repeat(40));
  console.log(`Webhook: ${webhookPath}`);
  console.log(`Data: ${JSON.stringify(data)}`);
  console.log('='.repeat(40));

  try {
    const result = await client.callWebhook(webhookPath, data);

    console.log('\nSuccess! Response:');
    console.log('-'.repeat(40));

    if (typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  } catch (error) {
    console.error('\nError calling webhook:', error.message);
    process.exit(1);
  }
}

main();
