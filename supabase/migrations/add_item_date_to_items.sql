-- Add item_date column to items table
ALTER TABLE public.items 
ADD COLUMN item_date date NOT NULL DEFAULT current_date;

-- Create indexes on item_date for faster queries
CREATE INDEX if not exists items_date_idx ON public.items(item_date DESC);
CREATE INDEX if not exists items_user_date_idx ON public.items(user_id, item_date DESC);
