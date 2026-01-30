export interface Field {
  name: string;
  type: string;
  isPrimary?: boolean;
  isNullable: boolean;
  defaultValue?: string;
}

export interface TableSchema {
  name: string;
  fields: Field[];
}

export const tenants = [
  "lbpl",
  "sellinamarsmaly",
  "pladisotsin",
  "cokepheb2b",
  "slmg",
  "iscoop",
  "kbuddy",
  "simasg",
  "rbinvth",
  "jnjaiph",
  "perfettisfai",
  "marsit",
  "itcvissfain",
  "sssl",
  "marssfath",
  "rbinvmy",
  "bbpl",
  "default",
  "paseo",
  "dbpl",
  "papa",
  "kgbpl",
  "cokemm",
  "enrich",
  "marsbel",
  "simamy",
  "apollotyre",
  "marssfain",
  "cashin",
  "yodabur",
  "unnati",
  "cokesa",
  "cokeslk",
  "digivyapar",
  "ckcoe",
  "kbl",
  "disha",
  "mbl",
  "niine"
];

// Parse CSV schema data
export async function loadSchema(): Promise<TableSchema[]> {
  try {
    const response = await fetch('/schema-filtered.csv');
    const text = await response.text();
    return parseCSVToSchema(text);
  } catch (error) {
    console.error('Failed to load schema:', error);
    return [];
  }
}

export function parseCSVToSchema(csvText: string): TableSchema[] {
  const lines = csvText.trim().split('\n');
  const tableMap = new Map<string, Field[]>();
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (handling potential commas in values)
    const parts = parseCSVLine(line);
    if (parts.length < 4) continue;
    
    let [tableName, columnName, dataType, isNullable, columnKey] = parts;
    
    // Clean up any whitespace characters (the CSV has some weird unicode chars)
    tableName = tableName.replace(/[\u2060\u200B\s]+/g, '').trim();
    columnName = columnName.replace(/[\u2060\u200B\s]+/g, '').trim();
    
    if (!tableName || !columnName) continue;
    
    // Skip backup tables to reduce clutter
    if (tableName.includes('_bkp_') || tableName.includes('_backup')) continue;
    
    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, []);
    }
    
    const fields = tableMap.get(tableName)!;
    
    // Avoid duplicate fields
    if (!fields.some(f => f.name === columnName)) {
      fields.push({
        name: columnName,
        type: dataType || 'varchar',
        isPrimary: columnKey === 'PRI',
        isNullable: isNullable !== 'NO',
        defaultValue: parts[5] || undefined
      });
    }
  }
  
  // Convert map to array and sort by table name
  const tables: TableSchema[] = [];
  tableMap.forEach((fields, name) => {
    // Sort fields: primary keys first, then alphabetically
    fields.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });
    
    tables.push({ name, fields });
  });
  
  return tables.sort((a, b) => a.name.localeCompare(b.name));
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Export a synchronous version for initial render (empty array)
export let schema: TableSchema[] = [];

// Load schema on module initialization
loadSchema().then(data => {
  schema = data;
});
