import { useState, useCallback } from 'react';
import { format } from 'sql-formatter';
import { toast } from '@/hooks/use-toast';
import type { TableSchema } from '@/data/schema';

/** Format SQL for readability; return original on parse error */
function formatSql(sql: string): string {
  try {
    const formatted = format(sql, { language: 'mysql', keywordCase: 'upper' });
    return formatted.trim();
  } catch {
    return sql;
  }
}

export interface JiraContextForPrompt {
  key: string;
  summary: string;
  description: string;
  status?: string;
  project?: string;
}

import { getApiBase } from '@/lib/api';

const API_BASE = getApiBase();
const CHAT_URL = `${API_BASE}/api/chat`;
const CHAT_END_URL = `${API_BASE}/api/chat/end`;

const SQL_SYSTEM_PROMPT = `You are SalesCode QueryGPT. SalesCode QueryGPT ONLY helps with SQL query generation, optimization, and database-related questions. Rules:
- When the user asks something NOT related to SQL (e.g. math, general knowledge, other topics), reply briefly: "SalesCode QueryGPT only supports SQL query generation and optimization." Do not use "I" — always refer to yourself as SalesCode QueryGPT.
- When the user asks for a SQL query, reply ONLY in this exact format with no other text, markdown, or headers:
sql query: <your SQL here>
explanation: <brief explanation of what the query does>
suggested indexes: <one index suggestion per line, only indexes that would actually speed up this specific query>
Do not include any fourth field or extra content.
- For any dynamic parameter the query needs (e.g. date range, user id, outlet code, filters that the user will supply at runtime), use placeholders in the form \${parameterName}. Examples: \${fromDate}, \${toDate}, \${outletCode}, \${loginid}. Use clear, camelCase names inside the braces. Example: WHERE creation_time >= '\${fromDate}' AND creation_time <= '\${toDate}'.
- For suggested indexes: (1) Look at the tables and columns provided in the schema — suggest only indexes on tables and columns that actually exist there; do not invent table or column names. (2) Only suggest an index if the query uses that column in WHERE, JOIN ON, ORDER BY, or GROUP BY. (3) Prefer columns that are good for indexing (e.g. IDs, codes, dates used in filters) and avoid suggesting indexes on columns that would not help this query or that are not in the schema. (4) Be specific: use exact table and column names from the schema, e.g. "ck_orders(creation_time, outletcode)" or "CREATE INDEX idx_orders_outlet ON ck_orders(outletcode);". (5) If no index would meaningfully help, or columns are not in the schema, output "None" or one line saying no additional indexes needed.
- For any requested "Name" (e.g. Distributor Name, Customer Name): join to the entity table that has the name column and select it; never use a code or ID as the name.`;

const TABLE_SUGGEST_PROMPT = `You are a database schema expert. Given a natural language question and a list of database tables with descriptions, respond with ONLY a comma-separated list of table names that are relevant to answer the question. Use only the exact table names provided. No other text, explanation, or punctuation. Example: ck_orders,ck_order_details,ck_outlet_details`;

/** Concept → table and key columns. Use these entity tables for any requested "name" or details; join from code/id columns, never use code as name. */
const CONCEPT_TO_TABLE_HINTS = `Concept → table and key columns (join from code/id in your fact table; use these for name/details, never code as name):

• User / Salesman / Distributor / Supplier (any person user data required): ck_user. Join on loginid, login_id, salesman_id, supplier, supplierid, created_by, modified_by, approved_by, parent. Use: name, email, mobile, address etc from ck_user table.

• Outlet / Customer: ck_outlet_details. Join on outletcode, outlet_code. Use: outlet_name, address, display_address, contact_name, contactno, beat, beat_name, channel, email, market_name, outlet_type.

• Product / SKU / Batch: ck_productdetails. Join on sku_code, skucode, batch_code. Use: sku_name, item_name, item_desc, sku_description, product, product_description, brand, category, size, mrp.

• Location / Region / Geography: ck_location. Join on location_hierarchy. Use: location_name, name, area, region, zone, city, state, country, district, territory, branch, cluster.

• Hierarchy (org tree): ck_hierarchy_metadata. Join on hierarchy. Columns: hierarchy, parent, location_hierarchy.

• Orders: header ck_orders (order_number, outletcode, supplierid, dates, totals); lines ck_order_details (order_id → ck_orders.id, skucode, batch_code, quantities, amounts).

• Sales / Invoices: header ck_sales (invoice_number, outletcode, order_number, amounts, delivery_date); lines ck_sales_details (sale_id → ck_sales.id, skucode, batch_code, quantities, amounts).

• DMS Loadout: dms_loadout (load_number, supplier → ck_user.loginid for distributor name); dms_loadout_details (load_number, invoice_number, outlet_code, route_code); dms_loadout_items (sku_code, batch_code, quantities).`;

/** Parse API response: extract "sql query:", "explanation:", and "suggested indexes:"; else return raw for out-of-scope */
function parseSqlResponse(text: string): {
  query?: string;
  explanation?: string;
  suggestedIndexes?: string[];
  error?: string;
} {
  const normalized = text.replace(/\r\n/g, '\n').replace(/^#+\s*/gm, '').trim();
  const sqlMatch = normalized.match(/\bsql\s+query\s*:\s*([\s\S]*?)(?=\n\s*explanation\s*:|$)/i);
  const explMatch = normalized.match(/\bexplanation\s*:\s*([\s\S]*?)(?=\n\s*suggested\s+indexes\s*:|$)/i);
  const indexesMatch = normalized.match(/\bsuggested\s+indexes\s*:\s*([\s\S]*)/i);
  if (sqlMatch && explMatch) {
    const rawQuery = sqlMatch[1].trim();
    const explanation = explMatch[1].trim();
    let suggestedIndexes: string[] | undefined;
    if (indexesMatch) {
      suggestedIndexes = indexesMatch[1]
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !/^(none|n\/a|—|--)$/i.test(s));
    }
    if (rawQuery) return { query: formatSql(rawQuery), explanation, suggestedIndexes };
  }
  return { error: text.trim() };
}

/** Parse comma-separated table names from chat response; optionally filter to valid names only */
function parseTableNames(
  text: string,
  validNames?: Set<string>
): string[] {
  const normalized = text.replace(/\r\n/g, ' ').trim();
  let names = normalized
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (validNames && validNames.size > 0) {
    const lower = new Map<string, string>();
    validNames.forEach((n) => lower.set(n.toLowerCase(), n));
    names = names
      .map((n) => lower.get(n.toLowerCase()))
      .filter((n): n is string => n != null);
  } else {
    names = names.map((n) => n.toLowerCase());
  }
  return names;
}

/** Extract a short, user-friendly message from API error response */
function getApiErrorMessage(response: Response, errData: unknown): string {
  if (response.status === 429) {
    return 'Rate limit exceeded. Please try again in a moment.';
  }
  if (response.status >= 500) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  if (errData && typeof errData === 'object') {
    const obj = errData as Record<string, unknown>;
    const msg = obj?.message ?? obj?.error;
    if (typeof msg === 'string' && msg.length < 200) return msg;
    if (msg && typeof msg === 'object' && typeof (msg as Record<string, unknown>).message === 'string') {
      return (msg as Record<string, unknown>).message as string;
    }
  }
  if (typeof errData === 'string' && errData.length < 200) return errData;
  return 'Something went wrong. Please try again later.';
}

/** Fallback: suggest tables by matching query words against table descriptions */
function fallbackSuggestTables(
  naturalQuery: string,
  tableDescriptions: Record<string, string>
): string[] {
  const words = naturalQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const tableNames = Object.keys(tableDescriptions);
  const scored = tableNames.map((name) => {
    const desc = (tableDescriptions[name] ?? '').toLowerCase();
    let score = 0;
    for (const w of words) {
      if (desc.includes(w) || name.toLowerCase().includes(w)) score++;
    }
    return { name, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).map((s) => s.name).slice(0, 6);
}

export interface TableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  description?: string;
}

/** Common column-to-table join rule: when any table has one of fromColumns, join to toTable.toColumn for more info */
export interface ColumnToTableMapping {
  fromColumns: string[];
  toTable: string;
  toColumn: string;
  description?: string;
}

/** Column description: plain string or object with description + optional example (e.g. for JSON columns) */
export type ColumnDescriptionEntry =
  | string
  | { description: string; example?: string };

export interface SchemaContext {
  tableDescriptions: Record<string, string>;
  columnDescriptions: Record<string, Record<string, ColumnDescriptionEntry>>;
  schema: TableSchema[];
  relationships: TableRelationship[];
  columnToTableMappings?: ColumnToTableMapping[];
}

/** Format column description for prompt: description + optional example. */
function formatColumnDesc(entry: ColumnDescriptionEntry | undefined): string {
  if (entry == null) return '';
  if (typeof entry === 'string') return entry;
  const { description, example } = entry;
  if (!description) return '';
  return example ? `${description} Example: ${example}` : description;
}

function buildSchemaContextString(
  selectedTables: string[],
  ctx: SchemaContext
): string {
  const selectedSet = new Set(selectedTables.map((t) => t.toLowerCase()));
  const lines: string[] = [
    'Selected tables and their columns (use only these for the query):',
    '',
  ];
  for (const tableName of selectedTables) {
    const desc = ctx.tableDescriptions[tableName];
    const colDesc = ctx.columnDescriptions[tableName];
    const tableSchema = ctx.schema.find((t) => t.name === tableName);
    const columns = tableSchema?.fields ?? [];
    lines.push(`Table: ${tableName}`);
    if (desc) lines.push(`  Description: ${desc}`);
    lines.push('  Columns:');
    for (const col of columns) {
      const key = col.isPrimary ? ' (PRI)' : '';
      const type = col.type || 'varchar';
      const descText = formatColumnDesc(colDesc?.[col.name]);
      const descLine = descText ? ` — ${descText}` : '';
      lines.push(`    - ${col.name} (${type}${key})${descLine}`);
    }
    lines.push('');
  }
  const relevantJoins = (ctx.relationships ?? []).filter(
    (r) =>
      selectedSet.has(r.fromTable.toLowerCase()) &&
      selectedSet.has(r.toTable.toLowerCase())
  );
  if (relevantJoins.length > 0) {
    lines.push('Joins / foreign keys (use these to join the tables above):');
    lines.push('');
    for (const r of relevantJoins) {
      const desc = r.description ? ` — ${r.description}` : '';
      lines.push(`  ${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn}${desc}`);
    }
    lines.push('');
  }
  const mappings = ctx.columnToTableMappings ?? [];
  if (mappings.length > 0) {
    const selectedColumnSet = new Set<string>();
    for (const tableName of selectedTables) {
      const tableSchema = ctx.schema.find((t) => t.name === tableName);
      for (const col of tableSchema?.fields ?? []) {
        selectedColumnSet.add(col.name.toLowerCase());
      }
    }
    const applicableMappings = mappings.filter((m) =>
      m.fromColumns.some((c) => selectedColumnSet.has(c.toLowerCase()))
    );
    if (applicableMappings.length > 0) {
      lines.push('Common column joins (if a table has any of these column names, join to the corresponding table for more information):');
      lines.push('');
      for (const m of applicableMappings) {
        const cols = m.fromColumns.join(', ');
        const desc = m.description ? ` — ${m.description}` : '';
        lines.push(`  Column(s): ${cols} -> ${m.toTable}.${m.toColumn}${desc}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

function buildJiraContextString(jira: JiraContextForPrompt): string {
  const lines: string[] = [
    'Jira issue context (use for report columns, filters, and business rules if relevant):',
    '',
    `Key: ${jira.key}`,
    `Summary: ${jira.summary}`,
  ];
  if (jira.description?.trim()) {
    lines.push(`Description: ${jira.description.trim()}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Build system instruction for chat session (schema + rules) — sent once per session */
function buildSystemInstruction(
  selectedTables: string[],
  schemaContext: SchemaContext,
  jiraContext?: JiraContextForPrompt | null
): string {
  const schemaBlock = buildSchemaContextString(selectedTables, schemaContext);
  const jiraBlock = jiraContext ? buildJiraContextString(jiraContext) : '';
  const parts = [
    SQL_SYSTEM_PROMPT,
    '',
    CONCEPT_TO_TABLE_HINTS,
    '',
    schemaBlock,
    '',
  ];
  if (jiraBlock) parts.push(jiraBlock);
  parts.push(
    'Generate a single SQL query and a brief explanation using only the tables and columns above. Use the listed joins/foreign keys to join tables correctly. For dynamic parameters (e.g. dates, filters), use placeholders like ${fromDate}, ${toDate}. For suggested indexes: use only table and column names that appear in the schema above; verify each column exists in that table before suggesting.' +
      (jiraContext ? ' Use the Jira context above to align columns, filters, and rules with the report if applicable.' : '')
  );
  return parts.join('\n');
}

function buildSqlMessage(
  userMessage: string,
  tenant: string,
  selectedTables: string[],
  schemaContext: SchemaContext,
  jiraContext?: JiraContextForPrompt | null
): string {
  const schemaBlock = buildSchemaContextString(selectedTables, schemaContext);
  const jiraBlock = jiraContext ? buildJiraContextString(jiraContext) : '';
  const parts = [
    SQL_SYSTEM_PROMPT,
    '',
    CONCEPT_TO_TABLE_HINTS,
    '',
    schemaBlock,
    '',
  ];
  if (jiraBlock) parts.push(jiraBlock);
  parts.push(
    `User (tenant: ${tenant}) question: ${userMessage}`,
    '',
    'Generate a single SQL query and a brief explanation using only the tables and columns above. Use the listed joins/foreign keys to join tables correctly. For dynamic parameters (e.g. dates, filters), use placeholders like ${fromDate}, ${toDate}. For suggested indexes: use only table and column names that appear in the schema above; verify each column exists in that table before suggesting.' +
      (jiraContext ? ' Use the Jira context above to align columns, filters, and rules with the report if applicable.' : '')
  );
  return parts.join('\n');
}

export interface QueryResult {
  query: string;
  explanation?: string;
  suggestedIndexes?: string[];
  optimizations?: string[];
  executionTips?: string;
  error?: string;
}

export function useQueryGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingTables, setIsSuggestingTables] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const endSession = useCallback(() => {
    if (sessionId) {
      fetch(CHAT_END_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
      setSessionId(null);
    }
  }, [sessionId]);

  const suggestTables = async (
    naturalQuery: string,
    tenant: string,
    tableDescriptions: Record<string, string>,
    jiraContext?: JiraContextForPrompt | null
  ): Promise<string[]> => {
    setIsSuggestingTables(true);
    try {
      const jiraBlock = jiraContext
        ? [
            '',
            'Jira context (use to pick relevant tables for this report):',
            `Key: ${jiraContext.key}`,
            `Summary: ${jiraContext.summary}`,
            jiraContext.description?.trim()
              ? `Description: ${jiraContext.description.trim()}`
              : '',
            '',
          ].join('\n')
        : '';
      const message = [
        TABLE_SUGGEST_PROMPT,
        '',
        'Tables and descriptions (use only these exact names):',
        JSON.stringify(tableDescriptions),
        jiraBlock,
        `User (tenant: ${tenant}) question: ${naturalQuery}`,
        '',
        'Respond with ONLY a comma-separated list of table names, nothing else.',
      ].join('\n');

      console.log('[QueryGPT] Prompt sent to chat API (suggest tables):', message);

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        let errData: unknown;
        try {
          errData = await response.json();
        } catch {
          errData = await response.text();
        }
        const body = errData && typeof errData === 'object' ? (errData as Record<string, unknown>) : {};
        throw new Error(getApiErrorMessage(response, body?.error ?? body?.message ?? errData));
      }

      const data = await response.json();
      const raw = typeof data?.reply === 'string' ? data.reply : '';
      const validNames = new Set(Object.keys(tableDescriptions));
      const names = parseTableNames(raw, validNames);
      if (names.length > 0) return names;
      return fallbackSuggestTables(naturalQuery, tableDescriptions);
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error('Failed to suggest tables');
    } finally {
      setIsSuggestingTables(false);
    }
  };

  const generateQuery = async (
    naturalQuery: string,
    tenant: string,
    selectedTables?: string[],
    schemaContext?: SchemaContext,
    jiraContext?: JiraContextForPrompt | null
  ): Promise<QueryResult | null> => {
    setIsLoading(true);
    try {
      const isFollowUp =
        sessionId &&
        (!selectedTables?.length || !schemaContext);

      let body: { message: string; sessionId?: string; systemInstruction?: string };
      if (isFollowUp) {
        body = { message: naturalQuery, sessionId: sessionId! };
      } else if (selectedTables?.length && schemaContext) {
        const systemInstruction = buildSystemInstruction(
          selectedTables,
          schemaContext,
          jiraContext
        );
        const message = `User (tenant: ${tenant}) question: ${naturalQuery}`;
        body = { message, systemInstruction };
      } else {
        const jiraBlock = jiraContext ? buildJiraContextString(jiraContext) : '';
        const message = [
          SQL_SYSTEM_PROMPT,
          '',
          jiraBlock,
          jiraBlock ? '\n' : '',
          `User (tenant: ${tenant}): ${naturalQuery}`,
        ].join('');
        body = { message };
      }

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errData: unknown;
        try {
          errData = await response.json();
        } catch {
          errData = await response.text();
        }
        const body = errData && typeof errData === 'object' ? (errData as Record<string, unknown>) : {};
        throw new Error(getApiErrorMessage(response, body?.error ?? body?.message ?? errData));
      }

      const data = await response.json();
      const newSessionId = typeof data?.sessionId === 'string' ? data.sessionId : null;
      if (newSessionId) setSessionId(newSessionId);

      const raw = typeof data?.reply === 'string' ? data.reply : '';
      const parsed = parseSqlResponse(raw);

      if (parsed.error && !parsed.query) {
        return { query: '', error: parsed.error };
      }
      return {
        query: parsed.query ?? '',
        explanation: parsed.explanation,
        suggestedIndexes: parsed.suggestedIndexes,
      };
    } catch (err) {
      console.error('Query generation failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate query. Please try again.';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suggestTables,
    generateQuery,
    endSession,
    hasActiveSession: !!sessionId,
    isLoading,
    isSuggestingTables,
  };
}
