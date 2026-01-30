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
 * Network status detection
 */
export const networkStatus = {
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Subscribe to online/offline events
   */
  subscribe(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
