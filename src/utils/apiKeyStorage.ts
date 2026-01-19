// API密钥存储管理

const API_KEY_STORAGE_KEY = 'qianwen_api_key'

/**
 * 获取保存的API密钥
 */
export function getApiKey(): string {
  // 优先从localStorage读取
  const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY)
  if (storedKey) {
    return storedKey
  }
  
  // 如果没有，尝试从环境变量读取（开发环境）
  const envKey = import.meta.env.VITE_QIANWEN_API_KEY
  return envKey || ''
}

/**
 * 保存API密钥
 */
export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

/**
 * 清除API密钥
 */
export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}

/**
 * 检查是否有API密钥
 */
export function hasApiKey(): boolean {
  return !!getApiKey()
}
