import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : GitHub Pages 하위 경로(사용자명.github.io/저장소명/)에서도 동작
export default defineConfig({
  plugins: [react()],
  base: './',
});
