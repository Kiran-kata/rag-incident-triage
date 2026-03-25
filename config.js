/**
 * Configuration constants for RAG Incident Triage Assistant
 */

// Supported LLM Providers
const PROVIDERS = {
  anthropic: {
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    format: 'anthropic',        // request/response format
    authHeader: 'x-api-key',   // header name for API key
    authPrefix: '',             // prefix before the key value
    hint: 'Get your key at <a href="https://console.anthropic.com" target="_blank" style="color:var(--accent);text-decoration:none;">console.anthropic.com</a>'
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    format: 'openai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    hint: 'Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent);text-decoration:none;">platform.openai.com</a>'
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    format: 'openai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    hint: 'Get your key at <a href="https://console.groq.com/keys" target="_blank" style="color:var(--accent);text-decoration:none;">console.groq.com</a>'
  },
  mistral: {
    label: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-large-latest',
    format: 'openai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    hint: 'Get your key at <a href="https://console.mistral.ai/api-keys/" target="_blank" style="color:var(--accent);text-decoration:none;">console.mistral.ai</a>'
  },
  custom: {
    label: 'Custom / Self-hosted',
    baseUrl: '',
    model: '',
    format: 'openai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    hint: 'Enter your custom OpenAI-compatible API base URL and model name below.'
  }
};

// Default API Configuration (overridden at runtime by provider selection)
const API_CONFIG = {
  MAX_TOKENS_RCA: 1000,
  MAX_TOKENS_SUMMARY: 1000,
  TIMEOUT_MS: 30000
};

// Chunking Configuration
const CHUNK_CONFIG = {
  CHUNK_SIZE: 5,        // Lines per chunk
  OVERLAP: 1,           // Overlap between chunks
  RETRIEVAL_TOP_K: 4    // Number of chunks to retrieve
};

// System Prompts
const SYSTEM_PROMPTS = {
  RCA: `You are a Site Reliability Engineer (SRE) AI assistant specializing in incident triage and root cause analysis. 
You analyze application logs and provide structured, actionable insights.

Your analysis always includes:
1. SEVERITY: CRITICAL / HIGH / MEDIUM / LOW
2. ROOT CAUSE: The most probable technical cause
3. AFFECTED SERVICES: List of impacted services
4. TIMELINE: Brief chronological reconstruction
5. RECOMMENDATIONS: Immediate actions to take

Be concise, technical, and precise. Reference specific log entries where relevant.`,

  SUMMARY: `You write concise incident summaries for engineering teams. Use plain language. Keep it under 120 words. Format: short paragraph + bullet list of key facts.`
};

// Severity mapping
const SEVERITY_LEVELS = {
  CRITICAL: { level: 'critical', label: 'CRITICAL', order: 4 },
  HIGH: { level: 'high', label: 'HIGH', order: 3 },
  MEDIUM: { level: 'medium', label: 'MEDIUM', order: 2 },
  LOW: { level: 'low', label: 'LOW', order: 1 }
};

// Error messages
const ERROR_MESSAGES = {
  NO_QUERY: 'Please enter a query.',
  NO_CHUNKS: 'Please chunk the logs first.',
  NO_API_KEY: 'Please enter your API key.',
  NO_LOGS: 'Please enter some logs first.',
  API_ERROR: 'API request failed',
  INVALID_RESPONSE: 'No response received from the LLM.'
};

// UI Configuration
const UI_CONFIG = {
  PIPE_ANIMATION_DELAY: 300,
  RESPONSE_BOX_MIN_HEIGHT: '80px',
  CHUNK_DISPLAY_MAX_HEIGHT: '200px',
  CONTEXT_MAX_HEIGHT: '180px'
};

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, CHUNK_CONFIG, SYSTEM_PROMPTS, SEVERITY_LEVELS, ERROR_MESSAGES, UI_CONFIG };
}
