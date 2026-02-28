import type { QueuedOperation, Item } from '@/types';

const QUEUE_KEY = 'inventory_offline_queue';
const ITEMS_CACHE_KEY = 'inventory_items_cache';

/**
 * Offline queue management using localStorage
 */
export const offlineQueue = {
  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Add operation to queue
   */
  enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const queue = this.getQueue();
    const newOperation: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(newOperation);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  /**
   * Remove operation from queue
   */
  dequeue(operationId: string): void {
    const queue = this.getQueue().filter(op => op.id !== operationId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  /**
   * Increment retry count for an operation
   */
  incrementRetry(operationId: string): void {
    const queue = this.getQueue().map(op => 
      op.id === operationId 
        ? { ...op, retryCount: op.retryCount + 1 }
        : op
    );
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  /**
   * Clear entire queue
   */
  clear(): void {
    localStorage.removeItem(QUEUE_KEY);
  },

  /**
   * Check if there are pending operations
   */
  hasPending(): boolean {
    return this.getQueue().length > 0;
  },

  /**
   * Get count of pending operations
   */
  getPendingCount(): number {
    return this.getQueue().length;
  },
};

/**
 * Items cache for offline viewing
 */
export const itemsCache = {
  /**
   * Save items to cache
   */
  save(items: Item[]): void {
    try {
      localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify({
        items,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Failed to cache items:', e);
    }
  },

  /**
   * Get cached items
   */
  get(): { items: Item[]; timestamp: number } | null {
    try {
      const data = localStorage.getItem(ITEMS_CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Clear cache
   */
  clear(): void {
    localStorage.removeItem(ITEMS_CACHE_KEY);
  },
};

/**
 * Network status detection with active health checking.
 *
 * navigator.onLine is unreliable on mobile: it returns true when the device
 * has a network interface up, even if the data path is broken (carrier congestion,
 * NAT timeout, tower handover). We supplement it with a periodic HEAD request
 * to the Supabase endpoint to verify actual connectivity.
 */

let _effectivelyOnline = navigator.onLine;
let _healthCheckTimer: ReturnType<typeof setInterval> | null = null;
const _subscribers: Array<(online: boolean) => void> = [];

const HEALTH_CHECK_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
const HEALTH_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const HEALTH_CHECK_TIMEOUT_MS = 5000;   // Give up after 5 seconds

async function checkConnectivity(): Promise<boolean> {
  if (!navigator.onLine) return false; // Fast fail: radio is definitely off

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    // mode: 'no-cors' avoids CORS preflight; we only care if the network path works.
    // The response is opaque (status 0) but fetch() only throws on actual network failure.
    await fetch(HEALTH_CHECK_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

function notifySubscribers(online: boolean): void {
  if (online !== _effectivelyOnline) {
    _effectivelyOnline = online;
    _subscribers.forEach((cb) => cb(online));
  }
}

function startHealthCheck(): void {
  if (_healthCheckTimer) return;
  _healthCheckTimer = setInterval(async () => {
    const online = await checkConnectivity();
    notifySubscribers(online);
  }, HEALTH_CHECK_INTERVAL_MS);
}

function stopHealthCheck(): void {
  if (_healthCheckTimer) {
    clearInterval(_healthCheckTimer);
    _healthCheckTimer = null;
  }
}

export const networkStatus = {
  isOnline(): boolean {
    return _effectivelyOnline;
  },

  /** Perform an immediate connectivity check (useful before critical operations). */
  async checkNow(): Promise<boolean> {
    const online = await checkConnectivity();
    notifySubscribers(online);
    return online;
  },

  subscribe(callback: (online: boolean) => void): () => void {
    _subscribers.push(callback);

    // Keep browser events as fast signals
    const handleOnline = async () => {
      // Browser says online — verify with a health check
      const online = await checkConnectivity();
      notifySubscribers(online);
    };
    const handleOffline = () => notifySubscribers(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start periodic health checks when we have subscribers
    startHealthCheck();

    return () => {
      const idx = _subscribers.indexOf(callback);
      if (idx >= 0) _subscribers.splice(idx, 1);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (_subscribers.length === 0) stopHealthCheck();
    };
  },
};
