import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { offlineQueue, itemsCache, networkStatus } from '@/lib/offline';
import { useAuth } from './useAuth';
import type { Item, ItemWithStatus, QueuedOperation } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseItemsReturn {
  items: ItemWithStatus[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  pendingCount: number;
  addItem: (name: string, priceCents: number, section: "income" | "expenses", itemDate: string, subSection?: string | null) => Promise<void>;
  updateItem: (id: string, name: string, priceCents: number) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  retrySync: () => Promise<void>;
}

export function useItems(): UseItemsReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(networkStatus.isOnline());
  const [pendingCount, setPendingCount] = useState(offlineQueue.getPendingCount());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch items from Supabase
  const fetchItems = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const itemsWithStatus: ItemWithStatus[] = (data || []).map((item: any) => ({
        ...(item as Item),
        syncStatus: 'synced' as const,
      }));

      setItems(itemsWithStatus);
      itemsCache.save(data || []);
      setError(null);
    } catch (e) {
      console.error('Failed to fetch items:', e);
      
      // Try to load from cache
      const cached = itemsCache.get();
      if (cached) {
        setItems(cached.items.map((item) => ({
          ...(item as Item),
          syncStatus: 'synced' as const,
        })));
      }
      
      setError('Failed to load items. Showing cached data.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`items:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Item;
            setItems(prev => {
              // Check if item already exists (from optimistic update)
              const exists = prev.some(item => item.id === newItem.id);
              if (exists) {
                return prev.map(item =>
                  item.id === newItem.id
                    ? { ...newItem, syncStatus: 'synced' as const }
                    : item
                );
              }
              return [{ ...newItem, syncStatus: 'synced' as const }, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Item;
            setItems(prev =>
              prev.map(item =>
                item.id === updatedItem.id
                  ? { ...updatedItem, syncStatus: 'synced' as const }
                  : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as Item;
            setItems(prev => prev.filter(item => item.id !== deletedItem.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = networkStatus.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        // Sync when coming back online
        syncOfflineQueue();
      }
    });

    return unsubscribe;
  }, []);

  // Sync offline queue
  const syncOfflineQueue = useCallback(async () => {
    if (!user || !networkStatus.isOnline()) return;

    const queue = offlineQueue.getQueue();
    
    for (const operation of queue) {
      try {
        await processOperation(operation, user.id);
        offlineQueue.dequeue(operation.id);
      } catch (e) {
        console.error('Failed to sync operation:', e);
        offlineQueue.incrementRetry(operation.id);
        
        if (operation.retryCount >= 3) {
          // Mark as error after 3 retries
          setItems(prev =>
            prev.map(item =>
              item.localId === operation.id || item.id === operation.itemId
                ? { ...item, syncStatus: 'error' as const }
                : item
            )
          );
        }
      }
    }

    setPendingCount(offlineQueue.getPendingCount());
    fetchItems();
  }, [user, fetchItems]);

  const processOperation = async (operation: QueuedOperation, userId: string) => {
    switch (operation.type) {
      case 'insert': {
        const { error } = await (supabase.from('items').insert([
          {
            user_id: userId,
            name: operation.data?.name || '',
            price_cents: operation.data?.price_cents || 0,
            section: operation.data?.section || 'income',
            sub_section: operation.data?.sub_section || null,
            item_date: operation.data?.item_date || new Date().toISOString().split('T')[0],
          }
        ]) as any);
        if (error) throw error;
        break;
      }
      case 'update': {
        if (!operation.itemId) throw new Error('Missing item ID');
        const { error } = await (supabase
          .from('items')
          .update({
            name: operation.data?.name,
            price_cents: operation.data?.price_cents,
          }) as any)
          .eq('id', operation.itemId);
        if (error) throw error;
        break;
      }
      case 'delete': {
        if (!operation.itemId) throw new Error('Missing item ID');
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', operation.itemId);
        if (error) throw error;
        break;
      }
    }
  };

  // Add item
  const addItem = useCallback(async (name: string, priceCents: number, section: "income" | "expenses", itemDate: string, subSection: string | null = null) => {
    if (!user) return;

    const localId = crypto.randomUUID();
    const optimisticItem: ItemWithStatus = {
      id: localId,
      user_id: user.id,
      name,
      price_cents: priceCents,
      section,
      sub_section: subSection,
      item_date: itemDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      syncStatus: 'pending',
      localId,
    };

    // Optimistic update
    setItems(prev => [optimisticItem, ...prev]);

    if (networkStatus.isOnline()) {
      try {
        const { data, error: insertError } = await (supabase
          .from('items')
          .insert([
            {
              user_id: user.id,
              name,
              price_cents: priceCents,
              section,
              sub_section: subSection,
              item_date: itemDate,
            }
          ]) as any)
          .select()
          .single();

        if (insertError) throw insertError;

        // Update with real ID
        if (data) {
          setItems(prev =>
            prev.map(item =>
              item.localId === localId
                ? { ...(data as Item), syncStatus: 'synced' as const }
                : item
            )
          );
        }
      } catch (e) {
        console.error('Failed to add item:', e);
        
        // Queue for later sync
        offlineQueue.enqueue({
          type: 'insert',
          data: { name, price_cents: priceCents, section, sub_section: subSection, item_date: itemDate },
        });
        
        setItems(prev =>
          prev.map(item =>
            item.localId === localId
              ? { ...item, syncStatus: 'error' as const }
              : item
          )
        );
        
        setPendingCount(offlineQueue.getPendingCount());
        setError('Failed to add item. Will retry when online.');
      }
    } else {
      // Queue for when online
      offlineQueue.enqueue({
        type: 'insert',
        data: { name, price_cents: priceCents, section, sub_section: subSection, item_date: itemDate },
      });
      setPendingCount(offlineQueue.getPendingCount());
    }
  }, [user]);

  // Update item
  const updateItem = useCallback(async (id: string, name: string, priceCents: number) => {
    if (!user) return;

    // Store original for rollback
    const originalItem = items.find(item => item.id === id);
    if (!originalItem) return;

    // Optimistic update
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, name, price_cents: priceCents, syncStatus: 'pending' as const }
          : item
      )
    );

    if (networkStatus.isOnline()) {
      try {
        const { error: updateError } = await (supabase
          .from('items')
          .update({ name, price_cents: priceCents }) as any)
          .eq('id', id);

        if (updateError) throw updateError;

        setItems(prev =>
          prev.map(item =>
            item.id === id
              ? { ...item, syncStatus: 'synced' as const }
              : item
          )
        );
      } catch (e) {
        console.error('Failed to update item:', e);
        
        // Rollback
        setItems(prev =>
          prev.map(item =>
            item.id === id ? originalItem : item
          )
        );
        
        setError('Failed to update item.');
      }
    } else {
      offlineQueue.enqueue({
        type: 'update',
        itemId: id,
        data: { name, price_cents: priceCents },
      });
      setPendingCount(offlineQueue.getPendingCount());
    }
  }, [user, items]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    if (!user) return;

    // Store original for rollback
    const originalItem = items.find(item => item.id === id);
    if (!originalItem) return;

    // Optimistic delete
    setItems(prev => prev.filter(item => item.id !== id));

    if (networkStatus.isOnline()) {
      try {
        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } catch (e) {
        console.error('Failed to delete item:', e);
        
        // Rollback
        setItems(prev => [...prev, originalItem]);
        setError('Failed to delete item.');
      }
    } else {
      offlineQueue.enqueue({
        type: 'delete',
        itemId: id,
      });
      setPendingCount(offlineQueue.getPendingCount());
    }
  }, [user, items]);

  // Manual retry sync
  const retrySync = useCallback(async () => {
    await syncOfflineQueue();
  }, [syncOfflineQueue]);

  return {
    items,
    isLoading,
    error,
    isOnline,
    pendingCount,
    addItem,
    updateItem,
    deleteItem,
    retrySync,
  };
}
