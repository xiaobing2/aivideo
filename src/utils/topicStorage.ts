// 话题历史记录管理

export interface TopicHistory {
  id: string
  topic: string
  timestamp: number
  useCount: number // 使用次数
}

const STORAGE_KEY = 'topic_history'
const MAX_HISTORY = 50 // 最多保存50条历史记录

/**
 * 获取所有话题历史
 */
export function getTopicHistory(): TopicHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored).sort((a: TopicHistory, b: TopicHistory) => {
      // 按使用次数和时间排序
      if (b.useCount !== a.useCount) return b.useCount - a.useCount
      return b.timestamp - a.timestamp
    })
  } catch (error) {
    console.error('Error loading topic history:', error)
    return []
  }
}

/**
 * 保存话题到历史记录
 */
export function saveTopic(topic: string): void {
  if (!topic.trim()) return
  
  const history = getTopicHistory()
  const trimmedTopic = topic.trim()
  
  // 检查是否已存在
  const existing = history.find(h => h.topic === trimmedTopic)
  
  if (existing) {
    // 更新使用次数和时间
    existing.useCount++
    existing.timestamp = Date.now()
  } else {
    // 添加新记录
    const newTopic: TopicHistory = {
      id: Date.now().toString(),
      topic: trimmedTopic,
      timestamp: Date.now(),
      useCount: 1
    }
    history.push(newTopic)
    
    // 限制历史记录数量
    if (history.length > MAX_HISTORY) {
      history.sort((a, b) => {
        if (b.useCount !== a.useCount) return b.useCount - a.useCount
        return b.timestamp - a.timestamp
      })
      history.splice(MAX_HISTORY)
    }
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

/**
 * 删除话题历史
 */
export function deleteTopic(id: string): void {
  const history = getTopicHistory()
  const filtered = history.filter(h => h.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * 清除所有话题历史
 */
export function clearTopicHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
