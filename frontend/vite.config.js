import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    // Map CRA-style env vars to Vite's import.meta.env
    'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
    'process.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
  },
  // Treat .js files as JSX (CRA allowed JSX in .js files, Vite requires .jsx by default)
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    outDir: 'build',
  },
})
