
import { GitState, GitCommit } from '../types';

const INITIAL_STATE: GitState = {
  commits: [],
  branches: { 'main': '' },
  remoteBranches: { 'origin/main': '' },
  currentBranch: 'main',
  head: '',
  stagedFiles: [],
  stashes: [],
  modifiedFiles: [],
  hasConflict: false
};

export class GitSimulator {
  private state: GitState;

  constructor(initialState?: GitState) {
    this.state = initialState || JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  getState(): GitState {
    return JSON.parse(JSON.stringify(this.state));
  }

  private generateId(): string {
    return Math.random().toString(16).substring(2, 8);
  }

  private getCommitHistory(startId: string): GitCommit[] {
    const history: GitCommit[] = [];
    let currId: string | null = startId;
    while (currId) {
      const commit = this.state.commits.find(c => c.id === currId);
      if (commit) {
        history.push(commit);
        currId = commit.parentId;
      } else {
        currId = null;
      }
    }
    return history;
  }

  execute(command: string): { output: string; isError: boolean } {
    const parts = command.trim().split(/\s+/);
    if (parts.length === 0) return { output: '', isError: false };
    if (parts[0] !== 'git') return { output: `錯誤: 找不到指令: ${parts[0]}`, isError: true };

    const action = parts[1];
    const args = parts.slice(2);

    // 衝突狀態下的限制
    if (this.state.hasConflict && !['add', 'commit', 'status', 'resolve'].includes(action)) {
      return { output: '錯誤: 請先解決衝突後再進行其他操作。', isError: true };
    }

    switch (action) {
      case 'init':
        this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
        return { output: '已初始化空的 Git 儲存庫', isError: false };

      case 'edit': // 模擬修改檔案的自定義指令
        const editFile = args[0] || 'README.md';
        if (!this.state.modifiedFiles.includes(editFile)) {
          this.state.modifiedFiles.push(editFile);
        }
        return { output: `已修改檔案: ${editFile}`, isError: false };

      case 'resolve': // 模擬解決衝突
        if (!this.state.hasConflict) return { output: '目前沒有衝突需要解決。', isError: true };
        this.state.hasConflict = false;
        this.state.stagedFiles.push(...this.state.modifiedFiles);
        this.state.modifiedFiles = [];
        return { output: '衝突已解決，檔案已自動暫存。', isError: false };

      case 'add':
        if (args.length === 0) return { output: '請指定要暫存的檔案', isError: true };
        this.state.stagedFiles.push(...this.state.modifiedFiles);
        this.state.modifiedFiles = [];
        return { output: '已將變更加入暫存區', isError: false };

      case 'status':
        let status = `位於分支 ${this.state.currentBranch}\n`;
        if (this.state.hasConflict) {
          status += `兩條分支都有變更。請解決衝突並提交結果。\n未合併的路徑：\n  (使用 "git resolve" 模擬手動解決)\n  雙方修改：README.md\n`;
        }
        if (this.state.stagedFiles.length > 0) {
          status += `待提交的變更：\n  ${this.state.stagedFiles.map(f => `新檔案: ${f}`).join('\n  ')}\n`;
        }
        if (this.state.modifiedFiles.length > 0 && !this.state.hasConflict) {
          status += `未暫存以備提交的變更：\n  ${this.state.modifiedFiles.map(f => `修改: ${f}`).join('\n  ')}\n`;
        }
        if (this.state.stagedFiles.length === 0 && this.state.modifiedFiles.length === 0 && !this.state.hasConflict) {
          status += `無檔案更動，工作區乾淨`;
        }
        return { output: status, isError: false };

      case 'commit':
        const mIdx = args.indexOf('-m');
        const msg = (mIdx !== -1 && args[mIdx + 1]) ? args[mIdx + 1].replace(/"/g, '') : 'Update';
        if (this.state.stagedFiles.length === 0) {
          return { output: '沒有東西可以提交 (使用 "git add" 進行暫存)', isError: true };
        }
        const newCommit: GitCommit = {
          id: this.generateId(),
          parentId: this.state.head || null,
          message: msg,
          author: 'User',
          timestamp: Date.now(),
          branch: this.state.currentBranch
        };
        this.state.commits.push(newCommit);
        this.state.head = newCommit.id;
        this.state.branches[this.state.currentBranch] = newCommit.id;
        this.state.stagedFiles = [];
        return { output: `[${this.state.currentBranch} ${newCommit.id}] ${msg}`, isError: false };

      case 'checkout':
      case 'switch':
        const isNew = args.includes('-b') || args.includes('-c');
        const target = args[args.length - 1];
        if (isNew) {
          this.state.branches[target] = this.state.head;
          this.state.currentBranch = target;
          return { output: `已切換至新分支 '${target}'`, isError: false };
        }
        if (this.state.branches[target] !== undefined) {
          this.state.currentBranch = target;
          this.state.head = this.state.branches[target];
          return { output: `已切換至分支 '${target}'`, isError: false };
        }
        return { output: `錯誤: 找不到分支 ${target}`, isError: true };

      case 'merge':
        const mergeSrc = args[0];
        const mergeId = this.state.branches[mergeSrc];
        if (!mergeId) return { output: `錯誤: 找不到分支 ${mergeSrc}`, isError: true };
        
        // 模擬隨機衝突 (如果是進階/中階難度且有重疊歷史)
        if (Math.random() > 0.6) {
          this.state.hasConflict = true;
          this.state.modifiedFiles = ['README.md'];
          return { output: `自動合併 README.md\n衝突 (內容)：README.md 中出現合併衝突\n自動合併失敗；請修復衝突然後提交結果。`, isError: false };
        }

        const mCommit: GitCommit = {
          id: this.generateId(),
          parentId: this.state.head,
          parent2Id: mergeId,
          message: `Merge branch '${mergeSrc}'`,
          author: 'User',
          timestamp: Date.now(),
          branch: this.state.currentBranch
        };
        this.state.commits.push(mCommit);
        this.state.head = mCommit.id;
        this.state.branches[this.state.currentBranch] = mCommit.id;
        return { output: `使用 'recursive' 策略完成合併。`, isError: false };

      case 'rebase':
        const rebaseTarget = args[0];
        const rebaseId = this.state.branches[rebaseTarget];
        if (!rebaseId) return { output: `錯誤: 找不到目標分支 ${rebaseTarget}`, isError: true };
        this.state.head = rebaseId;
        this.state.branches[this.state.currentBranch] = rebaseId;
        return { output: `成功快進 (Fast-forward) 至 ${rebaseTarget}`, isError: false };

      default:
        // 其他指令保持原樣
        return { output: `git: '${action}' 已執行。`, isError: false };
    }
  }
}
