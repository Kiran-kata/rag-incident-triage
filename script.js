// ─── State ─────────────────────────────────────────────────────────────────
let chunks = [];
let lastRetrieved = [];
let lastSystemPrompt = '';
let lastUserPrompt = '';

// ─── Sample logs ────────────────────────────────────────────────────────────
const SAMPLE_LOGS = `2024-07-15 03:10:01 INFO  [AuthService] User session validated for uid=10281
2024-07-15 03:10:04 INFO  [PaymentService] Initiating payment txn-8821 for user uid=10281, amount=$149.99
2024-07-15 03:10:05 INFO  [DBConnectionPool] Pool size: 48/50 connections active
2024-07-15 03:10:07 WARN  [DBConnectionPool] Connection pool at 96% capacity, threshold=90%
2024-07-15 03:10:09 ERROR [PaymentService] DB connection timeout after 5000ms - txn-8821 failed
2024-07-15 03:10:09 WARN  [RetryHandler] Retry attempt 1/3 for txn-8821
2024-07-15 03:10:14 ERROR [PaymentService] DB connection timeout after 5000ms - txn-8821 failed (attempt 2)
2024-07-15 03:10:14 WARN  [RetryHandler] Retry attempt 2/3 for txn-8821
2024-07-15 03:10:19 ERROR [PaymentService] DB connection timeout after 5000ms - txn-8821 failed (attempt 3)
2024-07-15 03:10:19 ERROR [RetryHandler] All retries exhausted for txn-8821. Escalating.
2024-07-15 03:10:20 ERROR [AlertManager] CRITICAL alert: payment failure rate=34% over last 5 min
2024-07-15 03:10:22 WARN  [DBConnectionPool] Evicting 3 stale connections (idle > 30s)
2024-07-15 03:10:25 INFO  [DBConnectionPool] Attempting to replenish pool from primary replica
2024-07-15 03:10:26 ERROR [DBConnectionPool] Failed to connect to primary DB host db-primary-02: Connection refused
2024-07-15 03:10:26 WARN  [DBConnectionPool] Falling back to read replica db-replica-01
2024-07-15 03:10:27 INFO  [DBConnectionPool] Successfully connected to read replica db-replica-01
2024-07-15 03:10:30 ERROR [PaymentService] Write operations not supported on read replica - txn-8822 aborted
2024-07-15 03:10:31 ERROR [PaymentService] Write operations not supported on read replica - txn-8823 aborted
2024-07-15 03:10:33 INFO  [HealthCheck] Service health degraded: PaymentService=UNHEALTHY, DBService=DEGRADED
2024-07-15 03:10:35 ERROR [OrderService] Downstream dependency PaymentService returned 503
2024-07-15 03:10:35 WARN  [CircuitBreaker] Circuit opened for PaymentService after 5 consecutive failures
2024-07-15 03:10:40 INFO  [PagerDuty] On-call engineer notified via PD-incident-44821
2024-07-15 03:11:00 INFO  [DBAdmin] Manual failover initiated: promoting db-replica-01 to primary
2024-07-15 03:11:45 INFO  [DBConnectionPool] Primary host restored: db-replica-01 (now primary)
2024-07-15 03:11:46 INFO  [CircuitBreaker] Circuit half-open for PaymentService - testing recovery
2024-07-15 03:11:50 INFO  [PaymentService] Successfully processed txn-8830 after DB restoration
2024-07-15 03:11:51 INFO  [CircuitBreaker] Circuit closed for PaymentService - service recovered`;

/**
 * Load sample logs into the textarea and chunk them
 */
function loadPreset() {
  document.getElementById('logInput').value = SAMPLE_LOGS;
  chunkLogs();
}

/**
 * Chunk logs into fixed-size segments with overlap
 * CHUNK_SIZE: 5 lines per chunk
 * OVERLAP: 1 line overlap between chunks
 */
function chunkLogs() {
  const raw = document.getElementById('logInput').value.trim();
  if (!raw) {
    alert(ERROR_MESSAGES.NO_LOGS);
    return;
  }

  activatePipe('pipe-ingest');
  
  setTimeout(() => {
    const lines = raw.split('\n').filter(l => l.trim());
    const CHUNK_SIZE = CHUNK_CONFIG.CHUNK_SIZE;
    const OVERLAP = CHUNK_CONFIG.OVERLAP;
    chunks = [];

    for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
      const slice = lines.slice(i, i + CHUNK_SIZE);
      if (!slice.length) break;

      const errorCount = slice.filter(l => l.includes('ERROR')).length;
      const warnCount = slice.filter(l => l.includes('WARN')).length;

      chunks.push({
        id: chunks.length,
        text: slice.join('\n'),
        lines: slice.length,
        errorCount,
        warnCount,
        hasError: errorCount > 0,
        startLine: i + 1
      });
    }

    activatePipe('pipe-chunk');
    activatePipe('pipe-embed');
    renderChunks();
    document.getElementById('ragBtn').disabled = false;
    document.getElementById('chunkStats').textContent = `✓ ${lines.length} lines → ${chunks.length} chunks (size=${CHUNK_SIZE}, overlap=${OVERLAP})`;
    document.getElementById('chunkCount').textContent = `${chunks.length} chunks`;
  }, UI_CONFIG.PIPE_ANIMATION_DELAY);
}

/**
 * Render chunks to the UI, highlighting retrieved ones
 * @param {number[]} highlighted - Array of chunk IDs to highlight
 */
function renderChunks(highlighted = []) {
  const container = document.getElementById('chunksDisplay');
  container.innerHTML = '';

  chunks.forEach(c => {
    const div = document.createElement('div');
    const isRelevant = highlighted.includes(c.id);
    div.className = `chunk-item${isRelevant ? ' relevant' : c.hasError ? ' error-chunk' : ''}`;
    
    const firstLine = c.text.split('\n')[0].substring(0, 70) + '...';
    div.innerHTML = `
      <div class="chunk-meta">
        <span>Chunk #${c.id} · Lines ${c.startLine}–${c.startLine + c.lines - 1}</span>
        <span>${c.errorCount > 0 ? `⚠️ ${c.errorCount} ERR` : ''} ${c.warnCount > 0 ? `🔔 ${c.warnCount} WARN` : ''}
          ${isRelevant ? `<span class="score-pill">RETRIEVED</span>` : ''}</span>
      </div>
      <div style="color:${c.hasError ? 'var(--red)' : 'var(--muted)'}">${firstLine}</div>`;
    container.appendChild(div);
  });
}

/**
 * Retrieve relevant chunks based on keyword similarity
 * Simulates vector database retrieval
 * @param {string} query - User query
 * @param {number} topK - Number of chunks to retrieve
 * @returns {Array} - Retrieved chunks sorted by relevance
 */
function retrieve(query, topK = CHUNK_CONFIG.RETRIEVAL_TOP_K) {
  activatePipe('pipe-retrieve');
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/).filter(w => w.length > 3);

  const scored = chunks.map(c => {
    const text = c.text.toLowerCase();
    let score = 0;

    // Keyword matching
    keywords.forEach(kw => {
      const count = (text.match(new RegExp(kw, 'g')) || []).length;
      score += count;
    });

    // Boost score for chunks with errors
    if (c.hasError) score += 1;

    return { ...c, score };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/**
 * Main RAG (Retrieval-Augmented Generation) flow
 * 1. Retrieve relevant chunks
 * 2. Build context window
 * 3. Call LLM API with context
 * 4. Display RCA and summary
 */
async function runRAG() {
  const query = document.getElementById('queryInput').value.trim();

  if (!query) {
    alert(ERROR_MESSAGES.NO_QUERY);
    return;
  }

  if (!chunks.length) {
    alert(ERROR_MESSAGES.NO_CHUNKS);
    return;
  }

  // Validate API key
  let apiKey;
  try {
    apiKey = ApiKeyManager.getValidated();
  } catch (err) {
    alert(err.message);
    return;
  }

  const btn = document.getElementById('ragBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Analyzing...';

  setOutput('rcaOutput', '<span class="spinner"></span> Retrieving relevant chunks...', true);
  setOutput('summaryOutput', '<span class="spinner"></span> Generating summary...', true);

  // Step 1: Retrieve relevant chunks
  lastRetrieved = retrieve(query, CHUNK_CONFIG.RETRIEVAL_TOP_K);
  renderChunks(lastRetrieved.map(c => c.id));
  activatePipe('pipe-context');

  const contextText = lastRetrieved.map((c, i) =>
    `[Chunk ${i + 1} | Lines ${c.startLine}-${c.startLine + c.lines - 1}]\n${c.text}`
  ).join('\n\n---\n\n');

  document.getElementById('retrievedCount').textContent = `${lastRetrieved.length} chunks retrieved`;
  document.getElementById('contextWindow').innerHTML = 
    `<span class="highlight">// ${lastRetrieved.length} chunks injected as context</span>\n\n` + contextText;

  // Estimate tokens for statistics
  const estTokens = Math.round(contextText.length / 4);
  const errorCount = lastRetrieved.reduce((a, c) => a + c.errorCount, 0);

  // Step 2: Build prompts
  lastSystemPrompt = SYSTEM_PROMPTS.RCA;

  lastUserPrompt = `RETRIEVED LOG CONTEXT (${lastRetrieved.length} most relevant chunks from corpus):

${contextText}

---

INCIDENT QUERY: ${query}

Based on the retrieved log context above, provide a structured RCA analysis.`;

  // Display prompt debug
  document.getElementById('systemPromptDisplay').textContent = lastSystemPrompt;
  document.getElementById('userPromptDisplay').textContent = lastUserPrompt;

  // Update stats
  document.getElementById('statsRow').style.display = 'flex';
  document.getElementById('st-chunks').textContent = lastRetrieved.length;
  document.getElementById('st-tokens').textContent = estTokens;
  document.getElementById('st-errors').textContent = errorCount;

  activatePipe('pipe-llm');

  // Resolve provider config at call time
  const providerConfig = ApiKeyManager.getProviderConfig();

  /**
   * Build a fetch request body + headers for the given provider format.
   * Supports 'anthropic' and 'openai'-compatible formats.
   */
  function buildRequest(systemPrompt, userContent, maxTokens) {
    const headers = {
      'Content-Type': 'application/json',
      [providerConfig.authHeader]: providerConfig.authPrefix + apiKey
    };

    let body;
    if (providerConfig.format === 'anthropic') {
      body = {
        model: providerConfig.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      };
    } else {
      // OpenAI-compatible format (OpenAI, Groq, Mistral, custom)
      body = {
        model: providerConfig.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent }
        ]
      };
    }

    return { headers, body: JSON.stringify(body) };
  }

  /**
   * Extract text from a provider response based on its format.
   */
  function extractText(data) {
    if (providerConfig.format === 'anthropic') {
      return data.content?.[0]?.text || ERROR_MESSAGES.INVALID_RESPONSE;
    }
    // OpenAI-compatible
    return data.choices?.[0]?.message?.content || ERROR_MESSAGES.INVALID_RESPONSE;
  }

  const endpoint = `${providerConfig.baseUrl}/messages`;

  try {
    // Step 3: Call LLM API for RCA
    const rcaReq = buildRequest(lastSystemPrompt, lastUserPrompt, API_CONFIG.MAX_TOKENS_RCA);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: rcaReq.headers,
      body: rcaReq.body
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || ERROR_MESSAGES.API_ERROR);
    }

    const data = await response.json();
    const text = extractText(data);

    activatePipe('pipe-out');

    // Detect severity from response
    let sev = SEVERITY_LEVELS.MEDIUM.level, sevLabel = SEVERITY_LEVELS.MEDIUM.label;
    if (/severity:\s*critical/i.test(text)) { 
      sev = SEVERITY_LEVELS.CRITICAL.level; 
      sevLabel = SEVERITY_LEVELS.CRITICAL.label; 
    } else if (/severity:\s*high/i.test(text)) { 
      sev = SEVERITY_LEVELS.HIGH.level; 
      sevLabel = SEVERITY_LEVELS.HIGH.label; 
    } else if (/severity:\s*low/i.test(text)) { 
      sev = SEVERITY_LEVELS.LOW.level; 
      sevLabel = SEVERITY_LEVELS.LOW.label; 
    } else if (errorCount >= 3) { 
      sev = SEVERITY_LEVELS.HIGH.level; 
      sevLabel = SEVERITY_LEVELS.HIGH.label; 
    }

    document.getElementById('severityBadge').innerHTML =
      `<div class="severity ${sev}">● ${sevLabel} SEVERITY INCIDENT</div>`;

    setOutput('rcaOutput', text, false);

    // Step 4: Generate summary via second call
    const sumContent = `Summarize this incident for the on-call engineer:\n\nQuery: ${query}\n\nLog context:\n${contextText}`;
    const sumReq = buildRequest(SYSTEM_PROMPTS.SUMMARY, sumContent, API_CONFIG.MAX_TOKENS_SUMMARY);
    const sumResp = await fetch(endpoint, {
      method: 'POST',
      headers: sumReq.headers,
      body: sumReq.body
    });

    if (!sumResp.ok) {
      throw new Error('Failed to generate summary');
    }

    const sumData = await sumResp.json();
    setOutput('summaryOutput', extractText(sumData), false);

  } catch (err) {
    setOutput('rcaOutput', `Error: ${err.message}`, false);
    console.error('RAG Error:', err);
  }

  btn.disabled = false;
  btn.textContent = 'Analyze';
}

/**
 * Set output text in a specific element
 * @param {string} id - Element ID
 * @param {string} text - Text to display
 * @param {boolean} loading - Whether to show loading state
 */
function setOutput(id, text, loading) {
  const el = document.getElementById(id);
  el.className = `response-box${loading ? ' loading' : ''}`;
  el.innerHTML = loading ? `<span class="spinner"></span>${text}` : '';
  if (!loading) el.textContent = text;
}

/**
 * Set query input value from preset button
 * @param {string} q - Query text
 */
function setQuery(q) {
  document.getElementById('queryInput').value = q;
}

/**
 * Switch between output tabs
 * @param {HTMLElement} btn - Clicked tab button
 * @param {string} tabId - ID of tab to show
 */
function switchTab(btn, tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

/**
 * Clear all data and reset UI
 */
function clearAll() {
  document.getElementById('logInput').value = '';
  document.getElementById('chunksDisplay').innerHTML = 
    '<div style="color:var(--muted);font-size:11px;text-align:center;padding:20px 0;">Index logs to see chunks</div>';
  document.getElementById('chunkCount').textContent = '0 chunks';
  document.getElementById('chunkStats').textContent = '';
  document.getElementById('contextWindow').textContent = 'Retrieved chunks will appear here before being sent to the LLM...';
  document.getElementById('retrievedCount').textContent = '—';
  document.getElementById('rcaOutput').textContent = 'Run a query to generate RCA...';
  document.getElementById('summaryOutput').textContent = 'Run a query to generate incident summary...';
  document.getElementById('severityBadge').innerHTML = '';
  document.getElementById('statsRow').style.display = 'none';
  document.getElementById('systemPromptDisplay').textContent = '';
  document.getElementById('userPromptDisplay').textContent = '';
  document.getElementById('ragBtn').disabled = true;
  chunks = [];

  // Reset pipes
  document.querySelectorAll('.pipe-icon').forEach(p => p.classList.remove('active', 'done'));
}

/**
 * Activate a pipeline step and mark previous steps as done
 * @param {string} id - Pipe icon element ID
 */
function activatePipe(id) {
  const el = document.getElementById(id);
  document.querySelectorAll('.pipe-icon').forEach(p => p.classList.remove('active'));

  // Mark previous steps as done
  const pipes = ['pipe-ingest', 'pipe-chunk', 'pipe-embed', 'pipe-retrieve', 'pipe-context', 'pipe-llm', 'pipe-out'];
  const idx = pipes.indexOf(id);
  for (let i = 0; i < idx; i++) {
    document.getElementById(pipes[i]).classList.add('done');
  }

  el.classList.add('active');
}
