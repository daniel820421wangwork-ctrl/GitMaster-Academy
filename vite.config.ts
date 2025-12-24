
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數，第三個參數為空字串表示載入所有變數（不限於 VITE_ 前綴）
  const env = loadEnv(mode, '.', '');
  
  return {
    base: "/GitMaster-Academy/",
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // 依據您的要求將 GEMINI_API_KEY 映射至全域變數
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        // 設定 @ 指向專案根目錄
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
