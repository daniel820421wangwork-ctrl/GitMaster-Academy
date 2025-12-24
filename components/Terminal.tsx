
import React, { useRef, useEffect } from 'react';
import { CommandHistoryItem } from '../types';

interface TerminalProps {
  onExecute: (cmd: string) => void;
  history: CommandHistoryItem[];
  isReadOnly?: boolean;
  inputOverride?: string;
  onInputChange?: (value: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({ 
  onExecute, 
  history, 
  isReadOnly = false, 
  inputOverride = '', 
  onInputChange 
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    if (inputOverride && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputOverride]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !inputOverride.trim()) return;
    onExecute(inputOverride);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f11] dark:bg-[#020406] font-mono border border-slate-200 dark:border-white/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl transition-all">
      <div className="bg-slate-100 dark:bg-white/5 px-4 md:px-6 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
        <div className="flex gap-1.5 md:gap-2">
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-rose-500/60"></div>
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-amber-500/60"></div>
          <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-emerald-500/60"></div>
        </div>
        <span className="text-slate-500 text-[12px] md:text-[14px] font-black tracking-widest uppercase">Git Bash</span>
      </div>

      <div className="flex-1 p-4 md:p-5 overflow-auto custom-scrollbar min-h-0 text-[13px] md:text-[14px]">
        {history.map((item, i) => (
          <div key={i} className="mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex gap-2 text-blue-500 dark:text-blue-400">
              <span className="font-black text-emerald-500">➜</span>
              <span className="text-amber-500 font-black tracking-tight">{item.command}</span>
            </div>
            {item.output && (
              <div className={`mt-1 pl-4 border-l-2 border-white/10 whitespace-pre-wrap leading-relaxed font-medium ${item.isError ? 'text-rose-400' : 'text-slate-400'}`}>
                {item.output}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!isReadOnly && (
        <form onSubmit={handleSubmit} className="p-3 md:p-4 bg-white/5 flex gap-2 md:gap-3 border-t border-white/5 items-center">
          <span className="text-emerald-500 font-black text-[14px] md:text-[16px]">➜</span>
          <input
            ref={inputRef}
            type="text"
            value={inputOverride}
            onChange={(e) => onInputChange?.(e.target.value)}
            placeholder="輸入指令..."
            className="bg-transparent border-none outline-none flex-1 text-slate-200 placeholder-slate-700 font-black text-[13px] md:text-[14px]"
          />
          <button 
            type="submit" 
            className="text-emerald-500 hover:text-emerald-400 transition-colors p-1"
            title="執行指令"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      )}
    </div>
  );
};

export default Terminal;
