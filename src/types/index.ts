/**
 * Database types for Supabase
 */

export interface Database {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          price_cents: number;
          section: "income" | "expenses";
          sub_section: string | null;
          item_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          price_cents: number;
          section?: "income" | "expenses";
          sub_section?: string | null;
          item_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          price_cents?: number;
          section?: "income" | "expenses";
          sub_section?: string | null;
          item_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

/**
 * Application types
 */

// Item as stored in database (price in cents)
export interface Item {
  id: string;
  user_id: string;
  name: string;
  price_cents: number;
  section: "income" | "expenses";
  sub_section: string | null;
  item_date: string;
  created_at: string;
  updated_at: string;
}

// Item for display purposes (price formatted)
export interface ItemDisplay extends Item {
  priceFormatted: string;
}

// Form data for creating/editing items
export interface ItemFormData {
  name: string;
  price: string; // String for form input, convert to cents when saving
}

// Optimistic update status
export type SyncStatus = 'synced' | 'pending' | 'error';

// Item with sync status for optimistic UI
export interface ItemWithStatus extends Item {
  syncStatus: SyncStatus;
  localId?: string; // For pending items before server assigns ID
}

// Offline queue entry
export interface QueuedOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  itemId?: string; // For update/delete operations
  data?: Partial<Item>;
  timestamp: number;
  retryCount: number;
}

// Auth state
export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

// User from Supabase Auth
export interface User {
  id: string;
  email: string | undefined;
  created_at: string;
  isAdmin?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Currency formatting options
export interface CurrencyOptions {
  locale: string;
  currency: string;
  symbol: string;
}
