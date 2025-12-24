
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type Theme = 'light' | 'dark' | 'system';
export type AppStep = 'select_difficulty' | 'task_briefing' | 'practice';

export interface GitCommit {
  id: string;
  parentId: string | null;
  parent2Id?: string | null;
  message: string;
  author: string;
  timestamp: number;
  branch: string;
}

export interface GitState {
  commits: GitCommit[];
  branches: Record<string, string>;
  remoteBranches: Record<string, string>;
  currentBranch: string;
  head: string;
  stagedFiles: string[];
  stashes: string[];
  modifiedFiles: string[]; // 新增：已修改但未暫存的檔案
  hasConflict: boolean;    // 新增：目前是否處於衝突狀態
}

export interface GitTask {
  title: string;
  description: string;
  difficulty: Difficulty;
  initialCommands: string[];
  solutionCommands: string[];
  goalDescription: string;
  validationLogic: string;
}

export interface CommandHistoryItem {
  command: string;
  output: string;
  isError: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
