
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GitState, GitTask, Difficulty, Theme, CommandHistoryItem, AppStep, ChatMessage } from './types';
import { GitSimulator } from './services/gitSimulator';
import { generateGitTask, validateTask, askAssistant } from './services/geminiService';
import GitGraph from './components/GitGraph';
import Terminal from './components/Terminal';
import GUIControls from './components/GUIControls';

const App: React.FC = () => {
  const [simulator] = useState(new GitSimulator());
  const [gitState, setGitState] = useState<GitState>(simulator.getState());
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [currentTask, setCurrentTask] = useState<GitTask | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [theme, setTheme] = useState<Theme>('system');
  const [userScenario, setUserScenario] = useState('');
  const [validationResult, setValidationResult] = useState<{ success: boolean; feedback: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [currentStep, setCurrentStep] = useState<AppStep>('select_difficulty');
  const [showSolution, setShowSolution] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  
  // AI 助手相關
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'task' | 'graph' | 'terminal'>('task');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [leftWidth, setLeftWidth] = useState(360);
  const [rightWidth, setRightWidth] = useState(450);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages]);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft.current) setLeftWidth(Math.max(280, Math.min(e.clientX, 500)));
      if (isResizingRight.current) setRightWidth(Math.max(320, Math.min(window.innerWidth - e.clientX, 700)));
    };
    const handleMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleExecute = useCallback((cmd: string) => {
    const result = simulator.execute(cmd);
    setHistory(prev => [...prev, { command: cmd, output: result.output, isError: result.isError }]);
    setGitState(simulator.getState());
    setValidationResult(null);
    setTerminalInput('');
    return result;
  }, [simulator]);

  const handleGuiCommand = useCallback((cmd: string) => {
    setTerminalInput(cmd);
    if (isMobile) {
      setActiveTab('terminal');
    }
  }, [isMobile]);

  const resetTaskProgress = useCallback(() => {
    if (!currentTask) return;
    simulator.execute('git init');
    const initialLogs: CommandHistoryItem[] = [];
    initialLogs.push({ command: 'git init', output: '儲存庫已重置', isError: false });
    for (const cmd of currentTask.initialCommands) {
      const res = simulator.execute(cmd);
      initialLogs.push({ command: cmd, output: res.output, isError: res.isError });
    }
    setHistory(initialLogs);
    setGitState(simulator.getState());
    setValidationResult(null);
    setShowSolution(false);
    setTerminalInput('');
    setAssistantMessages([]);
  }, [currentTask, simulator]);

  const handleValidate = useCallback(async () => {
    if (!currentTask || isValidating) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await validateTask(currentTask, gitState);
      setValidationResult(result);
    } catch (error: any) {
      console.error("驗證失敗:", error);
      setValidationResult({ 
        success: false, 
        feedback: "驗證過程中發生錯誤，請稍後再試。" 
      });
    } finally {
      setIsValidating(false);
    }
  }, [currentTask, gitState, isValidating]);

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim() || isAssistantThinking || !currentTask) return;

    const userMsg = assistantInput;
    setAssistantInput('');
    setAssistantMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAssistantThinking(true);

    try {
      const response = await askAssistant(currentTask, gitState, assistantMessages, userMsg);
      setAssistantMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setAssistantMessages(prev => [...prev, { role: 'model', text: "對不起，我連接不穩定，請再問一次。" }]);
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const startTaskGeneration = async (diff: Difficulty) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setDifficulty(diff);
    setIsLoadingTask(true);
    setValidationResult(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const task = await generateGitTask(diff, userScenario, controller.signal);
      if (controller.signal.aborted) return;
      setCurrentTask(task);
      simulator.execute('git init');
      const initialLogs: CommandHistoryItem[] = [];
      for (const cmd of task.initialCommands) {
        const res = simulator.execute(cmd);
        initialLogs.push({ command: cmd, output: res.output, isError: res.isError });
      }
      setHistory(initialLogs);
      setGitState(simulator.getState());
      setCurrentStep('task_briefing');
    } catch (error: any) {
      if (error.name !== 'AbortError') alert("生成失敗，請檢查連線狀態。");
    } finally {
      if (abortControllerRef.current === controller) setIsLoadingTask(false);
    }
  };

  const difficultyLabels: Record<Difficulty, string> = {
    'Beginner': '初學者',
    'Intermediate': '進階者',
    'Advanced': '專業級'
  };

  if (currentStep === 'select_difficulty') {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto">
        <div className="flex-1 max-w-4xl w-full mx-auto text-center space-y-10 py-12 px-6">
          <div className="space-y-4">
            <div className="inline-block p-5 bg-blue-600 rounded-[2rem] shadow-2xl mb-2">
              <i className="fa-brands fa-git-alt text-6xl text-white"></i>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">GitMaster Academy</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-bold">互動式 Git 實踐教學平台</p>
          </div>
          <div className="w-full space-y-8">
            <div className="text-left space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">自定義挑戰背景 (選填)</label>
              <textarea 
                value={userScenario}
                onChange={(e) => setUserScenario(e.target.value)}
                placeholder="例如：我剛完成了一個功能開發，但 main 分支有新提交，我需要 rebase..."
                className="w-full h-32 p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 outline-none transition-all shadow-inner text-base font-bold"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
              {(['Beginner', 'Intermediate', 'Advanced'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  disabled={isLoadingTask}
                  onClick={() => startTaskGeneration(d)}
                  className="group relative flex flex-col items-center p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:border-blue-500 transition-all active:scale-95 shadow-xl hover:shadow-blue-500/20"
                >
                  {isLoadingTask && difficulty === d && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] flex flex-col items-center justify-center z-20">
                      <i className="fa-solid fa-spinner animate-spin text-3xl text-blue-600"></i>
                    </div>
                  )}
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 text-2xl ${
                    d === 'Beginner' ? 'bg-emerald-100 text-emerald-600' : d === 'Intermediate' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    <i className={`fa-solid ${d === 'Beginner' ? 'fa-seedling' : d === 'Intermediate' ? 'fa-rocket' : 'fa-fire'}`}></i>
                  </div>
                  <h3 className="text-xl font-black mb-1 dark:text-white uppercase tracking-tight italic">{difficultyLabels[d]}</h3>
                  <div className="mt-3 px-6 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-all text-xs font-black uppercase tracking-widest">選擇</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'task_briefing' && currentTask) {
    return (
      <div className="h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 flex flex-col overflow-y-auto p-6">
        <div className="max-w-3xl w-full mx-auto bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
          <div className="p-8 md:p-14 flex flex-col gap-6 text-left">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight uppercase italic underline decoration-blue-500 decoration-4 underline-offset-8">{currentTask.title}</h2>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 max-h-[40vh] overflow-y-auto">
              <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-bold">{currentTask.description}</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-indigo-200 dark:border-indigo-800/50">
               <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">成功標準</h4>
               <p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">{currentTask.goalDescription}</p>
            </div>
            <button onClick={() => setCurrentStep('practice')} className="py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] text-xl font-black shadow-xl transition-all flex items-center justify-center gap-4 active:scale-95">
              進入實驗室 <i className="fa-solid fa-bolt"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} h-[100dvh] w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden font-sans relative`}>
      {/* 左側任務欄 */}
      <aside 
        style={{ width: isMobile ? '100%' : `${leftWidth}px` }}
        className={`${isMobile && activeTab !== 'task' ? 'hidden' : 'flex'} flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col shadow-xl z-10`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button onClick={() => setCurrentStep('select_difficulty')} className="text-slate-500 font-black text-xs uppercase tracking-widest hover:text-blue-500">返回</button>
          <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-full">
            {(['light', 'dark', 'system'] as Theme[]).map(t => (
              <button key={t} onClick={() => setTheme(t)} className={`p-1.5 rounded-full transition-all ${theme === t ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <i className={`fa-solid ${t === 'light' ? 'fa-sun' : t === 'dark' ? 'fa-moon' : 'fa-desktop'} text-xs`}></i>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <h2 className="text-xl font-black uppercase italic">{currentTask?.title}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">任務目標</p>
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 font-black text-sm">{currentTask?.goalDescription}</div>
          
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowSolution(!showSolution)} className="text-[10px] font-black uppercase underline text-amber-600 text-left">查看解答序列</button>
            {showSolution && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/50 text-xs font-mono space-y-1">
                {currentTask?.solutionCommands.map((c, i) => <div key={i}><span className="opacity-50">{i+1}.</span> {c}</div>)}
              </div>
            )}
            <button onClick={() => setIsAssistantOpen(true)} className="flex items-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition-all shadow-md group">
              <i className="fa-solid fa-robot group-hover:animate-bounce"></i>
              詢問 AI 教學助理
            </button>
          </div>

          <button 
            onClick={handleValidate} 
            disabled={isValidating}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {isValidating && <i className="fa-solid fa-spinner animate-spin"></i>}
            {isValidating ? '正在驗證...' : '驗證任務'}
          </button>
          <button onClick={resetTaskProgress} className="w-full py-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-500 font-black uppercase text-sm">重置進度</button>
          
          {validationResult && (
            <div className={`p-4 rounded-2xl border-2 font-bold text-xs ${validationResult.success ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-rose-100 border-rose-200 text-rose-800'}`}>
              {validationResult.feedback}
            </div>
          )}
        </div>
      </aside>

      {!isMobile && (
        <div className="w-1.5 bg-transparent hover:bg-blue-500/30 cursor-col-resize transition-all z-20 flex-shrink-0" onMouseDown={() => isResizingLeft.current = true} />
      )}

      {/* 中間圖譜欄 */}
      <main className={`${isMobile && activeTab !== 'graph' ? 'hidden' : 'flex'} flex-1 min-w-0 bg-white dark:bg-[#0f1113] flex flex-col relative overflow-hidden`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between">
           <span className="text-xs font-black uppercase tracking-widest text-slate-400">歷史圖譜</span>
           <span className="text-xs font-black px-3 py-1 bg-blue-600 text-white rounded-full">{gitState.currentBranch}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto"><GitGraph state={gitState} /></div>
      </main>

      {!isMobile && (
        <div className="w-1.5 bg-transparent hover:bg-blue-500/30 cursor-col-resize transition-all z-20 flex-shrink-0" onMouseDown={() => isResizingRight.current = true} />
      )}

      {/* 右側控制台欄 */}
      <section style={{ width: isMobile ? '100%' : `${rightWidth}px` }} className={`${isMobile && activeTab !== 'terminal' ? 'hidden' : 'flex'} flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a0c0e] flex flex-col shadow-xl overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase text-slate-400 tracking-widest">實驗控制台</div>
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="h-1/2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 overflow-y-auto scrollbar-hide">
            <GUIControls state={gitState} onExecute={handleGuiCommand} />
          </div>
          <div className="flex-1 min-h-0">
            <Terminal 
              onExecute={handleExecute} 
              history={history} 
              inputOverride={terminalInput} 
              onInputChange={setTerminalInput} 
            />
          </div>
        </div>
      </section>

      {/* AI 助手側邊視窗 */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-robot"></i>
                <span className="font-black uppercase tracking-widest text-sm">AI 教學小助手</span>
              </div>
              <button onClick={() => setIsAssistantOpen(false)} className="hover:text-white/70 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {assistantMessages.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <i className="fa-solid fa-wand-magic-sparkles text-4xl mb-4 opacity-30"></i>
                  <p className="font-bold text-sm">我是你的 Git 導師，不知道下一步該怎麼做嗎？問問我吧！</p>
                </div>
              )}
              {assistantMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAssistantThinking && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleAskAssistant} className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="詢問建議操作..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button 
                  type="submit" 
                  disabled={isAssistantThinking || !assistantInput.trim()}
                  className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMobile && (
        <nav className="h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-30">
           <button onClick={() => setActiveTab('task')} className={`flex flex-col items-center ${activeTab === 'task' ? 'text-blue-500' : 'text-slate-400'}`}><i className="fa-solid fa-list-check"></i><span className="text-[10px] font-black">任務</span></button>
           <button onClick={() => setActiveTab('graph')} className={`flex flex-col items-center ${activeTab === 'graph' ? 'text-blue-500' : 'text-slate-400'}`}><i className="fa-solid fa-diagram-project"></i><span className="text-[10px] font-black">圖譜</span></button>
           <button onClick={() => setActiveTab('terminal')} className={`flex flex-col items-center ${activeTab === 'terminal' ? 'text-blue-500' : 'text-slate-400'}`}><i className="fa-solid fa-terminal"></i><span className="text-[10px] font-black">控制台</span></button>
        </nav>
      )}
    </div>
  );
};

export default App;
