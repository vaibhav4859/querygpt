import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const API_URL = 'https://querygpt-backend.vercel.app/api/chat';

const SYSTEM_PROMPT = `You are SalesCode QueryGPT. SalesCode QueryGPT ONLY helps with SQL query generation, optimization, and database-related questions. Rules:
- When the user asks something NOT related to SQL (e.g. math, general knowledge, other topics), reply briefly: "SalesCode QueryGPT only supports SQL query generation and optimization." Do not use "I" — always refer to yourself as SalesCode QueryGPT.
- When the user asks for a SQL query, reply ONLY in this exact format with no other text, markdown, or headers:
sql query: <your SQL here>
explanation: <brief explanation of what the query does>
Do not include any third field or extra content.`;

function buildMessage(userMessage: string, tenant: string): string {
  return `${SYSTEM_PROMPT}\n\nUser (tenant: ${tenant}): ${userMessage}`;
}

/** Parse API response: extract "sql query:" and "explanation:" (or ### headers); else return raw for out-of-scope */
function parseResponse(text: string): { query?: string; explanation?: string; error?: string } {
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

export interface QueryResult {
  query: string;
  explanation?: string;
  optimizations?: string[];
  executionTips?: string;
  error?: string;
}

export function useQueryGeneration() {
  const [isLoading, setIsLoading] = useState(false);

  const generateQuery = async (
    naturalQuery: string,
    tenant: string
  ): Promise<QueryResult | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: buildMessage(naturalQuery, tenant),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const raw =
        typeof data?.reply === 'string' ? data.reply
        : typeof data?.message === 'string' ? data.message
        : typeof data?.response === 'string' ? data.response
        : typeof data?.text === 'string' ? data.text
        : typeof data?.content === 'string' ? data.content
        : typeof data === 'string' ? data
        : '';
      const parsed = parseResponse(raw);

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
    generateQuery,
    isLoading,
  };
}
