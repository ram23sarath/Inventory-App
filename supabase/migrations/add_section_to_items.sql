-- Add section column to items table
ALTER TABLE public.items ADD COLUMN section text NOT NULL DEFAULT 'income' CHECK (section in ('income', 'expenses'));

-- Create index on section for faster queries
CREATE INDEX if not exists items_section_idx ON public.items(section);
