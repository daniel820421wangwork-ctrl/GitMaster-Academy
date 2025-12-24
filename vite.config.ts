
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    /**
     * 透過 define 將 process.env.API_KEY 映射為環境變數的值。
     * 這允許前端程式碼繼續使用符合規範的 process.env.API_KEY 語法，
     * 同時在 Vite 開發環境中能讀取到 VITE_GEMINI_API_KEY。
     */
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.API_KEY),
  },
});
