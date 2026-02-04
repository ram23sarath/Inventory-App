-- Add sub_section column to items table
ALTER TABLE public.items ADD COLUMN sub_section text;

-- Create index on sub_section for faster queries
CREATE INDEX if not exists items_sub_section_idx ON public.items(sub_section);
