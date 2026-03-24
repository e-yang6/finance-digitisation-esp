import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import type { OcrResult, LineItem } from '@/types';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface TextractBlock {
  BlockType?: string;
  Text?: string;
  Confidence?: number;
  Relationships?: Array<{ Type: string; Ids: string[] }>;
  Id?: string;
  RowIndex?: number;
  ColumnIndex?: number;
  EntityTypes?: string[];
}

function extractKeyValuePairs(blocks: TextractBlock[]): Record<string, string> {
  const keyMap: Record<string, TextractBlock> = {};
  const valueMap: Record<string, TextractBlock> = {};
  const blockMap: Record<string, TextractBlock> = {};

  for (const block of blocks) {
    if (!block.Id) continue;
    blockMap[block.Id] = block;
    if (block.BlockType === 'KEY_VALUE_SET') {
      if (block.EntityTypes?.includes('KEY')) {
        keyMap[block.Id] = block;
      } else {
        valueMap[block.Id] = block;
      }
    }
  }

  const kvPairs: Record<string, string> = {};

  for (const [, keyBlock] of Object.entries(keyMap)) {
    const keyText = getTextFromBlock(keyBlock, blockMap);
    const valueBlockId = keyBlock.Relationships?.find(
      (r) => r.Type === 'VALUE'
    )?.Ids[0];

    if (valueBlockId) {
      const valueBlock = valueMap[valueBlockId];
      if (valueBlock) {
        const valueText = getTextFromBlock(valueBlock, blockMap);
        kvPairs[keyText.trim().toLowerCase()] = valueText.trim();
      }
    }
  }

  return kvPairs;
}

function getTextFromBlock(
  block: TextractBlock,
  blockMap: Record<string, TextractBlock>
): string {
  let text = '';
  const childIds =
    block.Relationships?.find((r) => r.Type === 'CHILD')?.Ids || [];
  for (const id of childIds) {
    const child = blockMap[id];
    if (child?.BlockType === 'WORD') {
      text += (child.Text || '') + ' ';
    }
  }
  return text.trim();
}

function extractTableData(
  blocks: TextractBlock[]
): Array<{ row: number; col: number; text: string }> {
  const blockMap: Record<string, TextractBlock> = {};
  for (const b of blocks) {
    if (b.Id) blockMap[b.Id] = b;
  }

  const cells: Array<{ row: number; col: number; text: string }> = [];
  for (const block of blocks) {
    if (block.BlockType === 'CELL' && block.RowIndex && block.ColumnIndex) {
      const text = getTextFromBlock(block, blockMap);
      cells.push({ row: block.RowIndex, col: block.ColumnIndex, text });
    }
  }
  return cells;
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractLineItemsFromTable(
  cells: Array<{ row: number; col: number; text: string }>
): LineItem[] {
  if (cells.length === 0) return [];

  const maxRow = Math.max(...cells.map((c) => c.row));
  const maxCol = Math.max(...cells.map((c) => c.col));

  const grid: string[][] = Array.from({ length: maxRow + 1 }, () =>
    Array(maxCol + 1).fill('')
  );
  for (const cell of cells) {
    grid[cell.row][cell.col] = cell.text;
  }

  const items: LineItem[] = [];
  // Skip header row (row 1)
  for (let r = 2; r <= maxRow; r++) {
    const row = grid[r];
    const description = row[1] || '';
    if (!description) continue;

    // Skip summary rows
    const lowerDesc = description.toLowerCase();
    if (
      lowerDesc.includes('subtotal') ||
      lowerDesc.includes('total') ||
      lowerDesc.includes('hst') ||
      lowerDesc.includes('gst') ||
      lowerDesc.includes('tax')
    )
      continue;

    const amount = parseAmount(row[maxCol] || row[maxCol - 1] || '0');
    const hst = maxCol >= 3 ? parseAmount(row[maxCol - 1] || '0') : 0;

    if (amount > 0) {
      items.push({ description: description.trim(), amount, hst });
    }
  }

  return items;
}

function findSummaryAmounts(
  blocks: TextractBlock[]
): { subtotal: number; hst: number; total: number } {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.BlockType === 'LINE' && block.Text) {
      lines.push(block.Text);
    }
  }

  let subtotal = 0;
  let hst = 0;
  let total = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const next = lines[i + 1] || '';
    const amountMatch = next.match(/[\$]?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseAmount(amountMatch[1]) : 0;

    // Also try inline: "Subtotal $42.78"
    const inlineMatch = lines[i].match(/[\$]([\d,]+\.\d{2})/);
    const inlineAmount = inlineMatch ? parseAmount(inlineMatch[1]) : amount;

    if (line.includes('subtotal') && subtotal === 0) {
      subtotal = inlineAmount;
    } else if ((line.includes('hst') || line.includes('gst') || line.includes('tax')) && hst === 0) {
      hst = inlineAmount;
    } else if (line.includes('total') && !line.includes('sub') && total === 0) {
      total = inlineAmount;
    }
  }

  return { subtotal, hst, total };
}

function extractVendorAndDate(
  kvPairs: Record<string, string>,
  blocks: TextractBlock[]
): { vendor: string; date: string } {
  // Try key-value pairs first
  let vendor =
    kvPairs['vendor'] ||
    kvPairs['store'] ||
    kvPairs['merchant'] ||
    kvPairs['sold by'] ||
    '';
  let date =
    kvPairs['date'] ||
    kvPairs['invoice date'] ||
    kvPairs['purchase date'] ||
    kvPairs['transaction date'] ||
    '';

  // Fall back to first LINE block for vendor (usually the store name at top)
  if (!vendor) {
    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text && block.Text.length > 2) {
        vendor = block.Text;
        break;
      }
    }
  }

  // Scan for date pattern if not found
  if (!date) {
    const datePattern = /\b(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4}|\w+ \d{1,2},? \d{4})\b/;
    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        const match = block.Text.match(datePattern);
        if (match) {
          date = match[1];
          break;
        }
      }
    }
  }

  // Normalize date to YYYY-MM-DD
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      date = d.toISOString().split('T')[0];
    }
  }

  return { vendor: vendor.trim(), date };
}

export async function processReceipt(imageBuffer: Buffer): Promise<OcrResult> {
  const startTime = Date.now();

  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['TABLES', 'FORMS'],
  });

  const response = await textractClient.send(command);
  const processingTimeMs = Date.now() - startTime;

  const blocks: TextractBlock[] = (response.Blocks || []) as TextractBlock[];

  const kvPairs = extractKeyValuePairs(blocks);
  const tableCells = extractTableData(blocks);
  const lineItems = extractLineItemsFromTable(tableCells);
  const { vendor, date } = extractVendorAndDate(kvPairs, blocks);
  const { subtotal, hst, total } = findSummaryAmounts(blocks);

  // Calculate totals from line items if not found in summary
  const computedSubtotal =
    subtotal ||
    lineItems.reduce((sum, item) => sum + item.amount, 0);
  const computedHst =
    hst || lineItems.reduce((sum, item) => sum + (item.hst || 0), 0);
  const computedTotal = total || computedSubtotal + computedHst;

  return {
    vendor,
    date,
    processingTimeMs,
    lineItems,
    subtotal: Math.round(computedSubtotal * 100) / 100,
    hst: Math.round(computedHst * 100) / 100,
    total: Math.round(computedTotal * 100) / 100,
  };
}
