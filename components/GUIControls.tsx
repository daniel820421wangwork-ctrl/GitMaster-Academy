
import React, { useState } from 'react';
import { GitState } from '../types';

interface GUIControlsProps {
  onExecute: (cmd: string) => void;
  state: GitState;
}

type Category = 'init' | 'daily' | 'branch' | 'sync' | 'rescue';

const GUIControls: React.FC<GUIControlsProps> = ({ onExecute, state }) => {
  const [category, setCategory] = useState<Category>('daily');

  const btnClass = "group flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all active:scale-95 text-center h-24";
  const iconBox = "w-8 h-8 rounded-lg flex items-center justify-center mb-1 shadow-sm group-hover:scale-110 transition-transform bg-white dark:bg-slate-800";

  const categoryLabels: Record<Category, string> = {
    'init': '初始化',
    'daily': '日常',
    'branch': '分支',
    'sync': '同步',
    'rescue': '救援'
  };

  const renderButtons = () => {
    switch(category) {
      case 'init':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onExecute('git init')} className={`${btnClass} bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900/40 dark:border-slate-800`}>
              <div className={iconBox}><i className="fa-solid fa-folder-plus"></i></div>
              <span className="text-[10px] font-black">git init</span>
            </button>
            <button onClick={() => onExecute('git clone <URL>')} className={`${btnClass} bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900/40 dark:border-slate-800`}>
              <div className={iconBox}><i className="fa-solid fa-clone"></i></div>
              <span className="text-[10px] font-black">git clone</span>
            </button>
          </div>
        );
      case 'daily':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onExecute('git edit app.js')} className={`${btnClass} bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-pen"></i></div>
              <span className="text-[10px] font-black">修改檔案</span>
            </button>
            <button onClick={() => onExecute('git status')} className={`${btnClass} bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-info-circle"></i></div>
              <span className="text-[10px] font-black">git status</span>
            </button>
            <button onClick={() => onExecute('git add .')} className={`${btnClass} bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-plus-square"></i></div>
              <span className="text-[10px] font-black">git add .</span>
            </button>
            <button onClick={() => onExecute('git commit -m "..."')} className={`${btnClass} bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-check-double"></i></div>
              <span className="text-[10px] font-black">git commit</span>
            </button>
          </div>
        );
      case 'branch':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onExecute('git checkout -b <branch>')} className={`${btnClass} bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-900/20 dark:border-purple-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-code-branch"></i></div>
              <span className="text-[10px] font-black">建立分支</span>
            </button>
            <button onClick={() => onExecute('git checkout <branch>')} className={`${btnClass} bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-900/20 dark:border-purple-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-shuffle"></i></div>
              <span className="text-[10px] font-black">切換分支</span>
            </button>
            <button onClick={() => onExecute('git merge <branch>')} className={`${btnClass} bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-code-merge"></i></div>
              <span className="text-[10px] font-black">合併分支</span>
            </button>
            <button onClick={() => onExecute('git rebase <branch>')} className={`${btnClass} bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-arrows-turn-to-dots"></i></div>
              <span className="text-[10px] font-black">衍合</span>
            </button>
          </div>
        );
      case 'sync':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onExecute('git fetch')} className={`${btnClass} bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-cloud-download"></i></div>
              <span className="text-[10px] font-black">git fetch</span>
            </button>
            <button onClick={() => onExecute('git pull')} className={`${btnClass} bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-down-long"></i></div>
              <span className="text-[10px] font-black">git pull</span>
            </button>
            <button onClick={() => onExecute('git push')} className={`${btnClass} bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800/50 col-span-2`}>
              <div className={iconBox}><i className="fa-solid fa-up-long"></i></div>
              <span className="text-[10px] font-black">git push</span>
            </button>
          </div>
        );
      case 'rescue':
        return (
          <div className="grid grid-cols-2 gap-3">
            {state.hasConflict && (
              <button onClick={() => onExecute('git resolve')} className={`${btnClass} bg-rose-600 border-rose-700 text-white col-span-2 animate-pulse`}>
                <div className={iconBox + " !bg-rose-100 !text-rose-600"}><i className="fa-solid fa-hand-holding-hand"></i></div>
                <span className="text-[10px] font-black">解決衝突 (GUI)</span>
              </button>
            )}
            <button onClick={() => onExecute('git stash')} className={`${btnClass} bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-box-archive"></i></div>
              <span className="text-[10px] font-black">stash</span>
            </button>
            <button onClick={() => onExecute('git reset --hard <ID>')} className={`${btnClass} bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/50`}>
              <div className={iconBox}><i className="fa-solid fa-history"></i></div>
              <span className="text-[10px] font-black">reset --hard</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {(['init', 'daily', 'branch', 'sync', 'rescue'] as Category[]).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap border-2 transition-all ${
              category === c 
              ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            {categoryLabels[c]}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderButtons()}
      </div>
    </div>
  );
};

export default GUIControls;
