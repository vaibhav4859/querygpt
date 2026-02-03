import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import type { TableSchema } from '@/data/schema';

const API_BASE = 'https://querygpt-backend.vercel.app';
const CHAT_URL = `${API_BASE}/api/chat`;

const SQL_SYSTEM_PROMPT = `You are SalesCode QueryGPT. SalesCode QueryGPT ONLY helps with SQL query generation, optimization, and database-related questions. Rules:
- When the user asks something NOT related to SQL (e.g. math, general knowledge, other topics), reply briefly: "SalesCode QueryGPT only supports SQL query generation and optimization." Do not use "I" — always refer to yourself as SalesCode QueryGPT.
- When the user asks for a SQL query, reply ONLY in this exact format with no other text, markdown, or headers:
sql query: <your SQL here>
explanation: <brief explanation of what the query does>
Do not include any third field or extra content.`;

const TABLE_SUGGEST_PROMPT = `You are a database schema expert. Given a natural language question and a list of database tables with descriptions, respond with ONLY a comma-separated list of table names that are relevant to answer the question. Use only the exact table names provided. No other text, explanation, or punctuation. Example: ck_orders,ck_order_details,ck_outlet_details`;

/** Parse API response: extract "sql query:" and "explanation:"; else return raw for out-of-scope */
function parseSqlResponse(text: string): { query?: string; explanation?: string; error?: string } {
  const normalized = text.replace(/\r\n/g, '\n').replace(/^#+\s*/gm, '').trim();
  const sqlMatch = normalized.match(/\bsql\s+query\s*:\s*([\s\S]*?)(?=\n\s*explanation\s*:|$)/i);
  const explMatch = normalized.match(/\bexplanation\s*:\s*([\s\S]*)/i);
  if (sqlMatch && explMatch) {
    const query = sqlMatch[1].trim();
    const explanation = explMatch[1].trim();
    if (query) return { query, explanation };
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

export interface SchemaContext {
  tableDescriptions: Record<string, string>;
  columnDescriptions: Record<string, Record<string, string>>;
  schema: TableSchema[];
  relationships: TableRelationship[];
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
      const descLine = colDesc?.[col.name] ? ` — ${colDesc[col.name]}` : '';
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
  return lines.join('\n');
}

function buildSqlMessage(
  userMessage: string,
  tenant: string,
  selectedTables: string[],
  schemaContext: SchemaContext
): string {
  const schemaBlock = buildSchemaContextString(selectedTables, schemaContext);
  return [
    SQL_SYSTEM_PROMPT,
    '',
    schemaBlock,
    '',
    `User (tenant: ${tenant}) question: ${userMessage}`,
    '',
    'Generate a single SQL query and a brief explanation using only the tables and columns above. Use the listed joins/foreign keys to join tables correctly.',
  ].join('\n');
}

export interface QueryResult {
  query: string;
  explanation?: string;
  optimizations?: string[];
  executionTips?: string;
  error?: string;
}

export function useQueryGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingTables, setIsSuggestingTables] = useState(false);

  const suggestTables = async (
    naturalQuery: string,
    tenant: string,
    tableDescriptions: Record<string, string>
  ): Promise<string[]> => {
    setIsSuggestingTables(true);
    try {
      const message = [
        TABLE_SUGGEST_PROMPT,
        '',
        'Tables and descriptions (use only these exact names):',
        JSON.stringify(tableDescriptions),
        '',
        `User (tenant: ${tenant}) question: ${naturalQuery}`,
        '',
        'Respond with ONLY a comma-separated list of table names, nothing else.',
      ].join('\n');

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const data = await response.json();
        const raw =
          typeof data?.reply === 'string'
            ? data.reply
            : typeof data?.message === 'string'
              ? data.message
              : typeof data?.response === 'string'
                ? data.response
                : typeof data?.text === 'string'
                  ? data.text
                  : typeof data?.content === 'string'
                    ? data.content
                    : typeof data === 'string'
                      ? data
                      : '';
        const validNames = new Set(Object.keys(tableDescriptions));
        const names = parseTableNames(raw, validNames);
        if (names.length > 0) return names;
      }
      return fallbackSuggestTables(naturalQuery, tableDescriptions);
    } catch {
      return fallbackSuggestTables(naturalQuery, tableDescriptions);
    } finally {
      setIsSuggestingTables(false);
    }
  };

  const generateQuery = async (
    naturalQuery: string,
    tenant: string,
    selectedTables?: string[],
    schemaContext?: SchemaContext
  ): Promise<QueryResult | null> => {
    setIsLoading(true);
    try {
      const message =
        selectedTables?.length && schemaContext
          ? buildSqlMessage(naturalQuery, tenant, selectedTables, schemaContext)
          : `${SQL_SYSTEM_PROMPT}\n\nUser (tenant: ${tenant}): ${naturalQuery}`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const raw =
        typeof data?.reply === 'string'
          ? data.reply
          : typeof data?.message === 'string'
            ? data.message
            : typeof data?.response === 'string'
              ? data.response
              : typeof data?.text === 'string'
                ? data.text
                : typeof data?.content === 'string'
                  ? data.content
                  : typeof data === 'string'
                    ? data
                    : '';
      const parsed = parseSqlResponse(raw);

      if (parsed.error && !parsed.query) {
        return { query: '', error: parsed.error };
      }
      return {
        query: parsed.query ?? '',
        explanation: parsed.explanation,
      };
    } catch (err) {
      console.error('Query generation failed:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate query. Please try again.',
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
    isLoading,
    isSuggestingTables,
  };
}
