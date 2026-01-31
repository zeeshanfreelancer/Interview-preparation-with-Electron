// Default languages configuration
const DEFAULT_LANGUAGES = ['React', 'JavaScript', 'HTML', 'CSS'];

// Check if in production
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Helper to log only in development
const devLog = (...args) => {
  if (!isProduction) console.log(...args);
};
const devWarn = (...args) => {
  if (!isProduction) console.warn(...args);
};
const devError = (...args) => {
  if (!isProduction) console.error(...args);
};

// Dynamic API base URL - will be updated by the server if port changes
// Default to 3000 (from server .env file), will be updated when server port is detected
let API_BASE_URL = 'http://localhost:3000/api';

// Expose API base URL for debugging
window.getApiBaseUrl = () => API_BASE_URL;
window.setApiBaseUrl = (port) => {
  if (window.updateApiBaseUrl) {
    window.updateApiBaseUrl(port);
  }
};

// Function to update API base URL if server uses different port
window.updateApiBaseUrl = (port) => {
  const currentPort = parseInt(API_BASE_URL.match(/:(\d+)/)?.[1] || 3000); // Default to 3000 from .env
  
  if (port && port !== currentPort) {
    const oldUrl = API_BASE_URL;
    API_BASE_URL = `http://localhost:${port}/api`;
    devLog(`[API] ✓ Updated base URL from ${oldUrl} to: ${API_BASE_URL}`);
    devLog(`[API] ⚠ Port changed from ${currentPort} to ${port} - clearing cache`);

    // Reset circuit breaker when port changes
    circuitBreakerState = 'CLOSED';
    failureCount = 0;
    lastFailureTime = 0;

    // Clear cache when port changes to avoid stale data
    requestCache.clear();
    // Restart cache cleanup after clearing
    stopCacheCleanup();
    startCacheCleanup();

    // Mark that we've updated the port
    window.apiPortUpdated = port;
  } else if (port === currentPort) {
    devLog(`[API] Port ${port} already matches current API URL: ${API_BASE_URL}`);
  }
};

// Fallback port detection if communication fails
let portDetectionAttempted = false;

async function detectServerPort() {
  if (portDetectionAttempted) return;
  portDetectionAttempted = true;

  devLog('[API] Checking server on port 3000 (from .env)...');

  // Just check port 3000 from .env file
  const port = 3000;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://localhost:${port}/api/health`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK') {
        devLog(`[API] ✓ Found server on port ${port}`);
        window.updateApiBaseUrl(port);
        return;
      }
    }
    
    throw new Error('Health check failed');
  } catch (error) {
    devWarn(`[API] Server not found on port ${port}:`, error.message);
    devWarn('[API] Make sure server is running on port 3000 (check .env file)');
  }
}

// Circuit breaker state
let circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const TIMEOUT_PERIOD = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Request deduplication cache with strict size limits
const requestCache = new Map();
const CACHE_TTL = 30000; // 30 seconds (increased from 5)
const MAX_CACHE_SIZE = 10; // Reduced from 50 to prevent memory leaks
const MAX_ENTRY_SIZE = 100000; // 100KB max per cache entry (prevents huge question arrays)

// Periodic cache cleanup to prevent memory leaks
let cacheCleanupInterval = null;
let cacheCleanupRunning = false; // Prevent multiple intervals

function startCacheCleanup() {
  if (cacheCleanupInterval || cacheCleanupRunning) return; // Already running
  
  cacheCleanupRunning = true;
  
  // Run cleanup every 30 seconds (much less frequent to reduce CPU usage)
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    let totalSize = 0;
    const entriesToDelete = [];
    
    // Find expired entries and calculate total size
    for (const [key, value] of requestCache.entries()) {
      // Check expiration
      if (now - value.timestamp > CACHE_TTL) {
        entriesToDelete.push(key);
        continue;
      }
      
      // Calculate entry size (rough estimate)
      const entrySize = JSON.stringify(value.data).length;
      totalSize += entrySize;
      
      // Remove entries that are too large
      if (entrySize > MAX_ENTRY_SIZE) {
        entriesToDelete.push(key);
      }
    }
    
    // Remove expired/oversized entries
    entriesToDelete.forEach(key => requestCache.delete(key));
    
    // If still over limit, remove oldest entries (aggressive cleanup)
    if (requestCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(requestCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = sortedEntries.slice(0, requestCache.size - MAX_CACHE_SIZE);
      entriesToRemove.forEach(([key]) => requestCache.delete(key));
    }
    
    // Emergency cleanup if total size exceeds 1MB
    if (totalSize > 1000000) {
      requestCache.clear();
    }
  }, 30000); // Run cleanup every 30 seconds (not every 2.5 seconds!)
}

function stopCacheCleanup() {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
    cacheCleanupRunning = false;
  }
}

// Start cache cleanup when module loads (only once to prevent multiple intervals)
if (typeof window !== 'undefined' && !window.cacheCleanupStarted) {
  window.cacheCleanupStarted = true;
  startCacheCleanup();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopCacheCleanup();
    requestCache.clear();
    window.cacheCleanupStarted = false;
  });
  
  // Aggressively clean cache when app is hidden/minimized
  if (document) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && requestCache.size > 0) {
        // Clear half the cache when app is hidden
        const entries = Array.from(requestCache.entries());
        const toDelete = entries.slice(0, Math.floor(entries.length / 2));
        toDelete.forEach(([key]) => requestCache.delete(key));
      }
    });
  }
}

/**
 * Circuit breaker implementation
 */
function checkCircuitBreaker() {
  const now = Date.now();

  if (circuitBreakerState === 'OPEN') {
    if (now - lastFailureTime > TIMEOUT_PERIOD) {
      circuitBreakerState = 'HALF_OPEN';
      devLog('[API] Circuit breaker: HALF_OPEN');
    } else {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }
  }
}

/**
 * Execute API call with circuit breaker and retry logic
 */
async function executeApiCall(url, options = {}, retries = MAX_RETRIES) {
  checkCircuitBreaker();

  // Create cache key
  const cacheKey = `${options.method || 'GET'}_${url}_${JSON.stringify(options.body || {})}`;

  // Check cache for GET requests
  if (options.method === 'GET' || !options.method) {
    const cached = requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful GET responses (but only if small enough)
    if ((options.method === 'GET' || !options.method) && data) {
      // Estimate data size
      const dataSize = JSON.stringify(data).length;
      
      // Only cache if under size limit
      if (dataSize <= MAX_ENTRY_SIZE) {
        requestCache.set(cacheKey, { data, timestamp: Date.now() });
        
        // Aggressive cleanup if cache grows too large
        if (requestCache.size > MAX_CACHE_SIZE) {
          // Remove oldest entries immediately
          const sortedEntries = Array.from(requestCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
          
          const entriesToRemove = sortedEntries.slice(0, requestCache.size - MAX_CACHE_SIZE);
          entriesToRemove.forEach(([key]) => requestCache.delete(key));
        }
      }
      // Don't cache large responses (like question arrays with rich text)
    }

    // Reset circuit breaker on success
    if (circuitBreakerState === 'HALF_OPEN') {
      circuitBreakerState = 'CLOSED';
      failureCount = 0;
      devLog('[API] Circuit breaker: CLOSED');
    }

    return data;

  } catch (error) {
    failureCount++;
    lastFailureTime = Date.now();

    if (failureCount >= FAILURE_THRESHOLD) {
      circuitBreakerState = 'OPEN';
      devError('[API] Circuit breaker: OPEN - too many failures');

      // Try to detect server port (but limit attempts to prevent memory leaks)
      if (!portDetectionAttempted) {
        devLog('[API] Circuit breaker opened - attempting port detection');
        detectServerPort();
        portDetectionAttempted = true;
      }
      // Don't retry port detection repeatedly - this causes memory leaks from setTimeout accumulation
    }

    if (retries > 0) {
      devWarn(`[API] Request failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return executeApiCall(url, options, retries - 1);
    }

    throw error;
  }
}

// API service functions
export const apiService = {
  // Questions
  async getQuestions(language) {
    try {
      const url = `${API_BASE_URL}/questions/${language}`;
      const currentPort = parseInt(API_BASE_URL.match(/:(\d+)/)?.[1] || 3000);
      devLog(`[API] Fetching questions for language: ${language}`);
      devLog(`[API] URL: ${url} (port ${currentPort})`);
      
      const questions = await executeApiCall(url);
      devLog(`[API] ✓ Received ${questions?.length || 0} questions for ${language} from port ${currentPort}`);
      
      if (questions && questions.length > 0) {
        devLog(`[API] Sample question IDs:`, questions.slice(0, 3).map(q => q._id || q.id));
      } else {
        devWarn(`[API] ⚠ No questions returned for ${language} from port ${currentPort}`);
      }
      
      return questions || [];
    } catch (error) {
      devError(`[API] ✗ Error fetching questions for ${language}:`, error);
      const currentPort = parseInt(API_BASE_URL.match(/:(\d+)/)?.[1] || 3000);
      devError(`[API] Error details:`, {
        message: error.message,
        url: `${API_BASE_URL}/questions/${language}`,
        apiBaseUrl: API_BASE_URL,
        port: currentPort
      });
      // Still return empty array but log the error for debugging
      return [];
    }
  },

  async createQuestion(questionData) {
    try {
      const result = await executeApiCall(`${API_BASE_URL}/questions`, {
        method: 'POST',
        body: JSON.stringify(questionData),
      });
      devLog('[API] Question created successfully:', result);
      return result;
    } catch (error) {
      devError('[API] Failed to create question:', error);
      throw new Error(`Failed to create question: ${error.message || 'Unknown error'}`);
    }
  },

  async updateQuestion(id, questionData) {
    return await executeApiCall(`${API_BASE_URL}/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  },

  async deleteQuestion(id) {
    return await executeApiCall(`${API_BASE_URL}/questions/${id}`, {
      method: 'DELETE',
    });
  },

  async searchQuestions(language, query) {
    return await executeApiCall(`${API_BASE_URL}/questions/search/${language}?q=${encodeURIComponent(query)}`);
  },

  // Languages
  async getLanguages() {
    try {
      return await executeApiCall(`${API_BASE_URL}/languages`);
    } catch (error) {
      devWarn('Error fetching languages, returning defaults:', error.message);
      return DEFAULT_LANGUAGES; // Return defaults
    }
  },

  async deleteLanguage(language) {
    return await executeApiCall(`${API_BASE_URL}/questions/language/${language}`, {
      method: 'DELETE',
    });
  },

  // Health check
  async healthCheck() {
    try {
      return await executeApiCall(`${API_BASE_URL}/health`);
    } catch (error) {
      devWarn('Health check failed:', error.message);
      throw error;
    }
  },

  // Database status check
  async getDatabaseStatus() {
    try {
      return await executeApiCall(`${API_BASE_URL}/db-status`);
    } catch (error) {
      devWarn('Database status check failed:', error.message);
      return {
        connected: false,
        error: error.message,
        totalQuestions: 0,
        questionsByLanguage: {}
      };
    }
  }
};