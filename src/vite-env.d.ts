/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QIANWEN_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
