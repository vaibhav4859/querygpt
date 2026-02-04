import { useState } from "react";

export interface JiraIssueListItem {
  key: string;
  summary: string;
  status: string;
  project: string;
}

export interface JiraIssueDetail {
  key: string;
  summary: string;
  description: string;
  status: string;
  project: string;
}

/** Extract Jira issue key from input: "CAV-1868" or "https://.../browse/CAV-1868" */
export function extractJiraKey(input: string): string | null {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  const keyOnly = /^[A-Z][A-Z0-9]+-\d+$/.exec(upper);
  if (keyOnly) return keyOnly[0];
  const browse = /\/browse\/([A-Z][A-Z0-9]+-\d+)/i.exec(trimmed);
  if (browse) return browse[1].toUpperCase();
  const path = /([A-Z][A-Z0-9]+-\d+)/i.exec(trimmed);
  if (path) return path[1].toUpperCase();
  return null;
}

const API_BASE = "https://querygpt-backend.vercel.app";

export function useJira() {
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingIssue, setIsLoadingIssue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMyIssues = async (userEmail: string): Promise<JiraIssueListItem[]> => {
    setIsLoadingList(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/jira/issues`, {
        headers: { "X-User-Email": userEmail },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to list Jira issues");
        return [];
      }
      return data.issues ?? [];
    } catch (e) {
      setError("Failed to load Jira issues");
      return [];
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchIssue = async (
    keyOrUrl: string,
    userEmail: string
  ): Promise<JiraIssueDetail | null> => {
    const key = extractJiraKey(keyOrUrl);
    if (!key) {
      setError("Invalid Jira key or URL");
      return null;
    }
    setIsLoadingIssue(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/jira/issue?key=${encodeURIComponent(key)}`, {
        headers: { "X-User-Email": userEmail },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to fetch Jira issue");
        return null;
      }
      return data;
    } catch (e) {
      setError("Failed to load Jira issue");
      return null;
    } finally {
      setIsLoadingIssue(false);
    }
  };

  return {
    listMyIssues,
    fetchIssue,
    extractJiraKey,
    isLoadingList,
    isLoadingIssue,
    error,
    clearError: () => setError(null),
  };
}
