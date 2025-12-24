
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, GitTask, GitState, ChatMessage } from "../types";

/**
 * 根據規範：
 * 1. 必須使用 process.env.API_KEY。
 * 2. 必須使用 new GoogleGenAI({ apiKey: ... })。
 * 3. 不可使用 GoogleGenerativeAI。
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateGitTask(difficulty: Difficulty, scenario?: string, signal?: AbortSignal): Promise<GitTask> {
  const scenarioPrompt = scenario ? `\n使用者提供的情境背景如下：\n"${scenario}"` : "";
  
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `請為一個 ${difficulty} 程度的學生生成一個 Git 教學任務。${scenarioPrompt}
    任務應涉及基礎到進階的 git 指令。
    請務必使用「繁體中文」來撰寫。
    
    請確保：
    1. 標題與描述具備實務場景感。
    2. initialCommands 是一組指令序列用來初始化環境。
    3. solutionCommands 是一組達成目標的「正確操作序列」。
    4. goalDescription 明確指出最終期望狀態。
    
    回傳一個符合 GitTask 介面的 JSON 物件。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          initialCommands: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          solutionCommands: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          goalDescription: { type: Type.STRING },
          validationLogic: { type: Type.STRING }
        },
        required: ["title", "description", "difficulty", "initialCommands", "solutionCommands", "goalDescription", "validationLogic"]
      }
    }
  });

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  return JSON.parse(response.text.trim()) as GitTask;
}

export async function validateTask(task: GitTask, currentState: GitState): Promise<{ success: boolean; feedback: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `任務目標：${task.goalDescription}
    當前 Git 狀態：${JSON.stringify(currentState)}
    
    請判斷使用者是否完成任務。
    請務必使用「繁體中文」回傳 JSON。
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          success: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING }
        },
        required: ["success", "feedback"]
      }
    }
  });

  return JSON.parse(response.text.trim());
}

export async function askAssistant(task: GitTask, state: GitState, history: ChatMessage[], question: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          text: `你是一位 Git 專家教學助手。
          當前任務：${task.title} - ${task.description}
          目標：${task.goalDescription}
          當前 Git 狀態：${JSON.stringify(state)}
          
          請根據使用者的問題提供具體的建議與指導。
          語氣要親切且具備啟發性，不要直接給出完整答案，而是引導使用者思考下一步該做什麼。
          請務必使用「繁體中文」回答。`
        },
        ...history.map(m => ({ text: `${m.role === 'user' ? '使用者' : '助理'}: ${m.text}` })),
        { text: `使用者：${question}` }
      ]
    }
  });

  return response.text || "抱歉，我現在無法回答這個問題。";
}
