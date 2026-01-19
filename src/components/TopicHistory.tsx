import { useState, useEffect } from 'react'
import { 
  getTopicHistory, 
  deleteTopic, 
  clearTopicHistory,
  saveTopic,
  type TopicHistory 
} from '../utils/topicStorage'

interface TopicHistoryProps {
  isOpen: boolean
  onClose: () => void
  onSelectTopic: (topic: string) => void
}

export default function TopicHistory({ isOpen, onClose, onSelectTopic }: TopicHistoryProps) {
  const [topics, setTopics] = useState<TopicHistory[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadTopics()
    }
  }, [isOpen])

  const loadTopics = () => {
    const history = getTopicHistory()
    setTopics(history)
  }

  const handleSelect = (topic: string) => {
    saveTopic(topic) // 增加使用次数
    onSelectTopic(topic)
    onClose()
  }

  const handleDelete = (id: string) => {
    deleteTopic(id)
    loadTopics()
  }

  const handleClear = () => {
    if (confirm('确定要清除所有话题历史吗？')) {
      clearTopicHistory()
      loadTopics()
    }
  }

  const filteredTopics = topics.filter(topic =>
    topic.topic.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 tech-container">
      <div className="tech-card w-full max-w-2xl h-[80vh] mx-4 flex flex-col animate-3d-in" style={{ border: '2px solid rgba(0, 240, 255, 0.5)' }}>
        {/* 标题栏 */}
        <div className="glass border-b border-white/10 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-cyan-100 neon-text">话题历史</h2>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="tech-button text-sm"
              style={{ 
                background: 'linear-gradient(135deg, #ff006e, #7b2ff7)',
                padding: '6px 16px'
              }}
            >
              清空
            </button>
            <button
              onClick={onClose}
              className="text-cyan-400 hover:text-cyan-300 text-3xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="glass border-b border-white/10 p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索话题..."
            className="tech-input w-full"
          />
        </div>

        {/* 话题列表 */}
        <div className="flex-1 overflow-y-auto tech-scrollbar p-4">
          {filteredTopics.length === 0 ? (
            <div className="flex items-center justify-center h-full text-cyan-400/60">
              <div className="text-center">
                {searchTerm ? (
                  <>
                    <div className="text-6xl mb-4 animate-pulse">🔍</div>
                    <p className="text-lg mb-2 gradient-text">未找到匹配的话题</p>
                    <p className="text-sm text-cyan-300/70">尝试其他搜索关键词</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4 animate-pulse">📝</div>
                    <p className="text-lg mb-2 gradient-text">暂无话题历史</p>
                    <p className="text-sm text-cyan-300/70">使用过的话题会显示在这里</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="glass border border-white/10 rounded-lg p-4 hover-lift transition-all cursor-pointer"
                  onClick={() => handleSelect(topic.topic)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-cyan-200 mb-2">
                        {topic.topic}
                      </p>
                      <div className="flex gap-4 text-xs text-cyan-300/70">
                        <span>使用 <span className="text-cyan-300">{topic.useCount}</span> 次</span>
                        <span>
                          {new Date(topic.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(topic.id)
                      }}
                      className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
