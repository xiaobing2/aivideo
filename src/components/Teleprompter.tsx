import { useState, useEffect, useRef } from 'react'

interface TeleprompterProps {
  isVisible: boolean
  onClose: () => void
  topic: string
}

export default function Teleprompter({ isVisible, onClose, topic }: TeleprompterProps) {
  const [outline, setOutline] = useState<string>('')
  const [isEditing, setIsEditing] = useState(true)
  const [fontSize, setFontSize] = useState(24)
  const [scrollSpeed, setScrollSpeed] = useState(0) // 0=手动，>0=自动滚动速度
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<number | null>(null)

  // 加载保存的大纲
  useEffect(() => {
    const saved = localStorage.getItem(`teleprompter_outline_${topic}`)
    if (saved) {
      setOutline(saved)
    } else if (topic) {
      // 如果没有保存的大纲，根据话题生成默认大纲
      setOutline(`关于"${topic}"的录制要点：\n\n1. 开场介绍\n2. 核心内容讲解\n3. 实际应用案例\n4. 总结与展望`)
    }
  }, [topic])

  // 保存大纲
  const saveOutline = () => {
    if (topic) {
      localStorage.setItem(`teleprompter_outline_${topic}`, outline)
      // 触发事件通知其他组件更新
      window.dispatchEvent(new Event('teleprompter-saved'))
    }
    setIsEditing(false)
  }

  // 自动滚动
  useEffect(() => {
    if (scrollSpeed > 0 && !isEditing && scrollContainerRef.current) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current
          const maxScroll = container.scrollHeight - container.clientHeight
          const currentScroll = container.scrollTop
          
          if (currentScroll < maxScroll) {
            const newPos = currentScroll + scrollSpeed * 0.5
            container.scrollTop = Math.min(newPos, maxScroll)
          } else {
            // 到达底部，停止滚动
            if (scrollIntervalRef.current) {
              clearInterval(scrollIntervalRef.current)
              scrollIntervalRef.current = null
              setScrollSpeed(0)
            }
          }
        }
      }, 50)
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
    }
  }, [scrollSpeed, isEditing])

  // 手动滚动时更新位置
  const handleManualScroll = () => {
    // 仅用于触发用户手动滚动时的逻辑（如未来做进度显示）
  }

  // 重置滚动
  const resetScroll = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }

  // 键盘快捷键
  useEffect(() => {
    if (!isVisible) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC 关闭
      if (e.key === 'Escape') {
        onClose()
      }
      // Space 暂停/继续滚动
      if (e.key === ' ' && !isEditing) {
        e.preventDefault()
        setScrollSpeed(prev => prev > 0 ? 0 : 3)
      }
      // 上下箭头调整滚动速度
      if (e.key === 'ArrowUp' && !isEditing) {
        e.preventDefault()
        setScrollSpeed(prev => Math.min(prev + 1, 10))
      }
      if (e.key === 'ArrowDown' && !isEditing) {
        e.preventDefault()
        setScrollSpeed(prev => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isVisible, isEditing, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center tech-container">
      <div className="tech-card w-full max-w-4xl h-[90vh] mx-4 flex flex-col animate-3d-in" style={{ border: '2px solid rgba(0, 240, 255, 0.5)' }}>
        {/* 标题栏 */}
        <div className="glass border-b border-white/10 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-cyan-100 neon-text">提词器</h2>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 text-3xl font-bold transition-colors"
            type="button"
          >
            ×
          </button>
        </div>

        {/* 控制栏 */}
        <div className="glass border-b border-white/10 p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-cyan-300">字体大小:</label>
            <input
              type="range"
              min="16"
              max="48"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-24 accent-cyan-400"
            />
            <span className="text-sm text-cyan-200 w-8">{fontSize}px</span>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-cyan-300">滚动速度:</label>
              <input
                type="range"
                min="0"
                max="10"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-24 accent-cyan-400"
              />
              <span className="text-sm text-cyan-200 w-12">
                {scrollSpeed === 0 ? '手动' : `${scrollSpeed}级`}
              </span>
              {scrollSpeed > 0 && (
                <button
                  onClick={() => setScrollSpeed(0)}
                  className="tech-button text-sm"
                  type="button"
                  style={{ background: 'linear-gradient(135deg, #ff006e, #7b2ff7)', padding: '6px 16px' }}
                >
                  暂停滚动
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={saveOutline}
                  className="tech-button hover-lift text-sm"
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.22), rgba(139, 92, 246, 0.14))',
                    borderColor: 'rgba(0, 240, 255, 0.75)',
                    color: 'rgba(245, 252, 255, 0.96)',
                    boxShadow: '0 0 18px rgba(0, 240, 255, 0.18)'
                  }}
                >
                  保存并开始
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="tech-button hover-lift text-sm"
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(0, 0, 0, 0.25))',
                    borderColor: 'rgba(255, 255, 255, 0.22)',
                    color: 'rgba(235, 243, 255, 0.92)'
                  }}
                >
                  取消编辑
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="tech-button hover-lift text-sm"
                  type="button"
                  style={{ background: 'linear-gradient(135deg, #666, #444)' }}
                >
                  编辑大纲
                </button>
                <button
                  onClick={resetScroll}
                  className="tech-button hover-lift text-sm"
                  type="button"
                  style={{ background: 'linear-gradient(135deg, #666, #444)' }}
                >
                  重置滚动
                </button>
              </>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden relative bg-black/50">
          <div className="grid-bg opacity-20"></div>
          {isEditing ? (
            <div className="h-full p-6 relative z-10">
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="输入录制大纲或要点，每行一个要点..."
                className="tech-input w-full h-full resize-none tech-scrollbar"
                style={{ 
                  fontSize: `${fontSize}px`, 
                  lineHeight: '1.8',
                  background: 'rgba(0, 0, 0, 0.55)',
                  color: 'rgba(220, 240, 255, 0.90)'
                }}
              />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleManualScroll}
              className="h-full overflow-y-auto tech-scrollbar p-8 relative z-10"
              style={{
                scrollBehavior: scrollSpeed > 0 ? 'auto' : 'smooth'
              }}
            >
              <div
                className="text-cyan-100 leading-relaxed whitespace-pre-wrap text-center"
                style={{ 
                  fontSize: `${fontSize}px`, 
                  lineHeight: '1.8'
                }}
              >
                {outline || '暂无大纲内容'}
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="glass border-t border-white/10 p-2 text-xs text-cyan-300/70 text-center">
          {isEditing ? (
            '💡 提示：输入录制要点，每行一个要点，支持换行。按ESC关闭'
          ) : (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span>💡 快捷键：</span>
              <span>空格键 - 暂停/继续</span>
              <span>↑↓ - 调整速度</span>
              <span>ESC - 关闭</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
