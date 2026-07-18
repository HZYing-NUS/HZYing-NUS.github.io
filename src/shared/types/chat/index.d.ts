export interface ChatModel {
  name: string; // model name, e.g. "moonshotai/kimi-k2-thinking"
  title: string; // model title, e.g. "Kimi K2 Thinking"
  provider?: string; // model provider, e.g. "openrouter"
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  model: string;
  parts: any;
  metadata?: any;
  content: any;
  skillVersionId?: string | null;
  skillDisabledAt?: Date | string | null;
  webSearchEnabled?: boolean;
  projectId?: string | null;
  projectSummary?: {
    name: string;
    description?: string | null;
    stage?: string | null;
    completedItems?: string | null;
    currentProblem?: string | null;
    nextSteps?: string | null;
    recentMemories?: Array<{
      id: string;
      content: string;
      sourceChatId?: string | null;
      sourceMessageId?: string | null;
    }>;
  } | null;
}
