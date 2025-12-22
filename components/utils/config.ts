// File: /LOOPOS/components/utils/config.ts

// Se existir a variável no .env, usa ela. Se não, usa localhost como fallback.
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';