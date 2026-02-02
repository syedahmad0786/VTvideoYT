# n8n Workflow Caller

A Node.js utility to call and execute n8n workflows via webhooks and the n8n API.

## Features

- **Webhook Triggers**: Call workflow webhooks with custom data
- **API Integration**: List, get, and execute workflows via the n8n REST API
- **Execution History**: View workflow execution history
- **Workflow Management**: Activate/deactivate workflows programmatically

## Installation

```bash
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your n8n configuration:
```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here
```

### Getting an n8n API Key

1. Open your n8n instance
2. Go to **Settings** > **API**
3. Generate a new API key
4. Copy the key to your `.env` file

## Usage

### Command Line Interface

```bash
# Show help
npm start help

# List all workflows (requires API key)
npm start list

# Get workflow details
npm start get <workflow-id>

# Call a webhook
npm start webhook <webhook-path> [json-data]

# Execute a workflow via API
npm start execute <workflow-id> [json-data]

# View execution history
npm start executions [workflow-id]
```

### Examples

```bash
# Call a webhook with data
npm start webhook webhook/my-workflow '{"name": "John", "email": "john@example.com"}'

# Execute a workflow by ID
npm start execute abc123def456 '{"input": "process this"}'

# List all active workflows
npm start list
```

### Standalone Scripts

```bash
# Call a webhook
npm run call-webhook -- webhook/my-workflow '{"key": "value"}'

# List all workflows
npm run list-workflows

# Execute a specific workflow
npm run execute-workflow -- <workflow-id> '{"data": "here"}'
```

### Programmatic Usage

```javascript
import { N8nClient } from './src/n8n-client.js';

const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'your-api-key'
});

// Call a webhook
const webhookResult = await client.callWebhook('webhook/my-workflow', {
  name: 'John',
  action: 'process'
});

// List workflows
const workflows = await client.listWorkflows();

// Execute a workflow
const execution = await client.executeWorkflow('workflow-id', {
  input: 'data'
});

// Get execution history
const executions = await client.getExecutions('workflow-id', 10);
```

## API Reference

### N8nClient

#### Constructor Options

| Option | Description | Default |
|--------|-------------|---------|
| `baseUrl` | n8n instance URL | `process.env.N8N_BASE_URL` or `http://localhost:5678` |
| `apiKey` | n8n API key | `process.env.N8N_API_KEY` |
| `webhookAuthHeader` | Custom auth header name | `process.env.WEBHOOK_AUTH_HEADER` |
| `webhookAuthValue` | Custom auth header value | `process.env.WEBHOOK_AUTH_VALUE` |

#### Methods

| Method | Description | Requires API Key |
|--------|-------------|------------------|
| `callWebhook(path, data, method)` | Trigger a workflow via webhook | No |
| `listWorkflows(active)` | List all workflows | Yes |
| `getWorkflow(id)` | Get workflow details | Yes |
| `executeWorkflow(id, data)` | Execute a workflow | Yes |
| `getExecutions(workflowId, limit)` | Get execution history | Yes |
| `activateWorkflow(id)` | Activate a workflow | Yes |
| `deactivateWorkflow(id)` | Deactivate a workflow | Yes |

## Webhook vs API Execution

### Webhooks
- Don't require API key
- Workflow must have a Webhook trigger node
- Webhook must be active
- Best for triggering workflows from external services

### API Execution
- Requires API key
- Can execute any workflow
- More control over execution
- Can retrieve execution results
