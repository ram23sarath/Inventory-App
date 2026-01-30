import type { Item } from '@/types';
import { formatDecimal } from './currency';

/**
 * Export items to CSV format
 */
export function exportToCSV(items: Item[]): string {
  const headers = ['Name', 'Price', 'Created At'];
  const rows = items.map(item => [
    // Escape commas and quotes in name
    `"${item.name.replace(/"/g, '""')}"`,
    formatDecimal(item.price_cents),
    new Date(item.created_at).toISOString(),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Parse CSV content to items
 */
export function parseCSV(content: string): Array<{ name: string; priceCents: number }> {
  const lines = content.trim().split('\n');
  
  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
  
  const items: Array<{ name: string; priceCents: number }> = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields with commas
    const match = line.match(/^"([^"]*(?:""[^"]*)*)"|^([^,]*)/);
    let name = '';
    let remainder = line;

    if (match) {
      if (match[1] !== undefined) {
        // Quoted field
        name = match[1].replace(/""/g, '"');
        remainder = line.slice(match[0].length + 1); // +1 for comma
      } else if (match[2] !== undefined) {
        // Unquoted field
        name = match[2];
        remainder = line.slice(match[0].length + 1);
      }
    }

    const parts = remainder.split(',');
    const priceStr = parts[0]?.trim() || '0';
    const price = parseFloat(priceStr);
    
    if (name && !isNaN(price)) {
      items.push({
        name: name.trim(),
        priceCents: Math.round(price * 100),
      });
    }
  }

  return items;
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file contents
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
