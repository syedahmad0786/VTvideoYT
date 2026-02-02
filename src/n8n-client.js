/**
 * n8n Client - Utility to interact with n8n workflows
 * Supports both webhook triggers and the n8n API
 */

import 'dotenv/config';

export class N8nClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.apiKey = options.apiKey || process.env.N8N_API_KEY;
    this.webhookAuthHeader = options.webhookAuthHeader || process.env.WEBHOOK_AUTH_HEADER;
    this.webhookAuthValue = options.webhookAuthValue || process.env.WEBHOOK_AUTH_VALUE;

    // Remove trailing slash from base URL
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  /**
   * Get default headers for API requests
   */
  getApiHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Get headers for webhook requests
   */
  getWebhookHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.webhookAuthHeader && this.webhookAuthValue) {
      headers[this.webhookAuthHeader] = this.webhookAuthValue;
    }

    return headers;
  }

  /**
   * Call a webhook to trigger a workflow
   * @param {string} webhookPath - The webhook path or full URL
   * @param {object} data - Data to send to the webhook
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @returns {Promise<object>} - Response from the webhook
   */
  async callWebhook(webhookPath, data = {}, method = 'POST') {
    let url = webhookPath;

    // If it's not a full URL, construct it
    if (!webhookPath.startsWith('http')) {
      // Remove leading slash if present
      const path = webhookPath.replace(/^\//, '');
      url = `${this.baseUrl}/${path}`;
    }

    console.log(`Calling webhook: ${method} ${url}`);

    const options = {
      method,
      headers: this.getWebhookHeaders(),
    };

    if (method !== 'GET' && Object.keys(data).length > 0) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * List all workflows using the n8n API
   * @param {boolean} active - Filter by active status (optional)
   * @returns {Promise<object[]>} - List of workflows
   */
  async listWorkflows(active = null) {
    if (!this.apiKey) {
      throw new Error('API key is required to list workflows. Set N8N_API_KEY in your environment.');
    }

    let url = `${this.baseUrl}/api/v1/workflows`;
    if (active !== null) {
      url += `?active=${active}`;
    }

    console.log(`Fetching workflows from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getApiHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list workflows: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get a specific workflow by ID
   * @param {string} workflowId - The workflow ID
   * @returns {Promise<object>} - Workflow details
   */
  async getWorkflow(workflowId) {
    if (!this.apiKey) {
      throw new Error('API key is required to get workflow. Set N8N_API_KEY in your environment.');
    }

    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}`;
    console.log(`Fetching workflow: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getApiHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get workflow: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Execute a workflow by ID using the n8n API
   * @param {string} workflowId - The workflow ID to execute
   * @param {object} data - Data to pass to the workflow
   * @returns {Promise<object>} - Execution result
   */
  async executeWorkflow(workflowId, data = {}) {
    if (!this.apiKey) {
      throw new Error('API key is required to execute workflow. Set N8N_API_KEY in your environment.');
    }

    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}/run`;
    console.log(`Executing workflow ${workflowId}: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getApiHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to execute workflow: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get execution history for a workflow
   * @param {string} workflowId - The workflow ID
   * @param {number} limit - Number of executions to return
   * @returns {Promise<object[]>} - List of executions
   */
  async getExecutions(workflowId = null, limit = 10) {
    if (!this.apiKey) {
      throw new Error('API key is required to get executions. Set N8N_API_KEY in your environment.');
    }

    let url = `${this.baseUrl}/api/v1/executions?limit=${limit}`;
    if (workflowId) {
      url += `&workflowId=${workflowId}`;
    }

    console.log(`Fetching executions: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getApiHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get executions: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Activate a workflow
   * @param {string} workflowId - The workflow ID to activate
   * @returns {Promise<object>} - Updated workflow
   */
  async activateWorkflow(workflowId) {
    if (!this.apiKey) {
      throw new Error('API key is required to activate workflow. Set N8N_API_KEY in your environment.');
    }

    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}/activate`;
    console.log(`Activating workflow ${workflowId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getApiHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to activate workflow: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Deactivate a workflow
   * @param {string} workflowId - The workflow ID to deactivate
   * @returns {Promise<object>} - Updated workflow
   */
  async deactivateWorkflow(workflowId) {
    if (!this.apiKey) {
      throw new Error('API key is required to deactivate workflow. Set N8N_API_KEY in your environment.');
    }

    const url = `${this.baseUrl}/api/v1/workflows/${workflowId}/deactivate`;
    console.log(`Deactivating workflow ${workflowId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getApiHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to deactivate workflow: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }
}

export default N8nClient;
