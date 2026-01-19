import { useState, useEffect, useRef } from 'react'
import { generateComments, generateSingleComment } from '../utils/aiService'
import { saveTopic } from '../utils/topicStorage'

interface Comment {
  id: string
  content: string
  author: string
  timestamp: number
  avatar?: string
}

interface CommentPanelProps {
  topic: string
  onTopicChange: (topic: string) => void
  isRecording: boolean
  onShowTopicHistory?: () => void
  onShowVideoList?: () => void
  onShowSettings?: () => void
  onNewComment?: (comment: string) => void
}

export default function CommentPanel({ 
  topic, 
  onTopicChange, 
  isRecording, 
  onShowTopicHistory, 
  onShowVideoList,
  onShowSettings,
  onNewComment 
}: CommentPanelProps) {
  const [inputTopic, setInputTopic] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string>('')
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [generateInterval, setGenerateInterval] = useState(5000) // 默认5秒生成一条
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<number | null>(null)
  const shouldAutoScroll = useRef(true)

  // 自动滚动到底部
  useEffect(() => {
    if (shouldAutoScroll.current && commentsEndRef.current) {
      // 使用setTimeout确保DOM更新后再滚动
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [comments])

  // 检测用户是否手动滚动
  const handleScroll = () => {
    if (!commentsContainerRef.current) return
    
    const container = commentsContainerRef.current
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    
    shouldAutoScroll.current = isNearBottom
  }

  // 自动生成评论
  useEffect(() => {
    if (autoGenerate && isRecording && topic) {
      // 立即生成第一条（延迟一点确保状态已更新）
      const timer = setTimeout(() => {
        generateNewComment()
      }, 500)
      
      // 然后按间隔生成
      intervalRef.current = window.setInterval(async () => {
        await generateNewComment()
      }, generateInterval)
      
      return () => {
        clearTimeout(timer)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoGenerate, isRecording, topic, generateInterval])

  // 生成新评论（自动生成时使用）
  const generateNewComment = async () => {
    if (!topic || isGenerating) return

    setIsGenerating(true)
    setError('')
    
    try {
      // 使用单条评论生成函数，确保每次只生成一条
      const content = await generateSingleComment(topic)
      if (content) {
        const userId = Math.floor(Math.random() * 10000)
        const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🔬', '👩‍🔬']
        const comment: Comment = {
          id: Date.now().toString(),
          content: content,
          author: `用户${userId}`,
          timestamp: Date.now(),
          avatar: avatars[userId % avatars.length]
        }
        setComments(prev => [...prev, comment])
        shouldAutoScroll.current = true
        
        // 通知新评论生成，用于生成建议
        if (onNewComment) {
          onNewComment(content)
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || '生成评论失败'
      if (errorMsg.includes('API密钥')) {
        setError('请先配置API密钥，点击右上角"设置"按钮')
        // 停止自动生成
        setAutoGenerate(false)
      } else {
        // 其他错误不显示，继续生成（会使用备用评论）
        console.error('Error generating comment:', err)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // 手动生成评论
  const handleGenerate = async () => {
    if (!inputTopic.trim()) {
      setError('请输入话题')
      return
    }

    const trimmedTopic = inputTopic.trim()
    onTopicChange(trimmedTopic)
    saveTopic(trimmedTopic) // 保存到历史记录
    setIsGenerating(true)
    setError('')
    
    try {
      const newComments = await generateComments(trimmedTopic, 5)
      if (newComments && newComments.length > 0) {
      const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🔬', '👩‍🔬']
      const formattedComments: Comment[] = newComments.map((content, index) => {
        const userId = Math.floor(Math.random() * 10000)
        return {
          id: (Date.now() + index).toString(),
          content,
          author: `用户${userId}`,
          timestamp: Date.now() + index * 1000,
          avatar: avatars[userId % avatars.length]
        }
      })
      setComments(formattedComments)
      shouldAutoScroll.current = true
      
      // 通知新评论生成（取最后一条）
      if (onNewComment && formattedComments.length > 0) {
        onNewComment(formattedComments[formattedComments.length - 1].content)
      }
      }
    } catch (err: any) {
      const errorMsg = err?.message || '生成评论失败'
      if (errorMsg.includes('API密钥')) {
        setError('请先配置API密钥，点击右上角"设置"按钮')
      } else {
        setError(errorMsg)
      }
      console.error('Error generating comments:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // 清空评论
  const clearComments = () => {
    if (confirm('确定要清空所有消息吗？')) {
      setComments([])
    }
  }

  // 格式化时间显示
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // 判断是否需要显示时间分隔线
  const shouldShowTimeDivider = (current: Comment, previous: Comment | null): boolean => {
    if (!previous) return false
    const diff = current.timestamp - previous.timestamp
    return diff > 5 * 60 * 1000 // 5分钟
  }

  return (
    <div className="flex flex-col h-full bg-transparent relative" style={{ pointerEvents: 'auto' }}>
      {/* 标题栏 */}
      <div className="glass p-5 flex items-center justify-between border-b border-purple-400/30 relative"
           style={{
             background: 'linear-gradient(135deg, rgba(123, 47, 247, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%)',
             boxShadow: '0 4px 20px rgba(123, 47, 247, 0.1), inset 0 1px 0 rgba(123, 47, 247, 0.2)'
           }}>
        {/* 背景光效 */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{
               background: 'linear-gradient(90deg, transparent, rgba(123, 47, 247, 0.2), transparent)',
               animation: 'float 3s ease-in-out infinite'
             }}></div>

        <h1
          className="text-2xl font-bold gradient-text neon-text relative z-20"
          style={{
            fontSize: '24px',
            textShadow: '0 0 20px rgba(123, 47, 247, 0.5)'
          }}
        >
          AI评论生成
        </h1>

        <div className="flex items-center gap-2 relative" style={{ zIndex: 50, pointerEvents: 'auto' }}>
          {onShowVideoList && (
            <button
              onClick={onShowVideoList}
              onPointerUp={onShowVideoList}
              className="tech-button toolbar-button hover-lift text-sm"
              title="视频列表"
            >
              <span className="mr-1.5">🎥</span>
              <span>视频列表</span>
            </button>
          )}
          {onShowTopicHistory && (
            <button
              onClick={onShowTopicHistory}
              onPointerUp={onShowTopicHistory}
              className="tech-button toolbar-button hover-lift text-sm"
              title="话题历史"
            >
              <span className="mr-1.5">📝</span>
              <span>历史</span>
            </button>
          )}
          {onShowSettings && (
            <button
              onClick={onShowSettings}
              onPointerUp={onShowSettings}
              className="tech-button toolbar-button hover-lift text-sm"
              title="配置API密钥"
            >
              <span className="mr-1.5">⚙️</span>
              <span>设置</span>
            </button>
          )}
        </div>
      </div>

      {/* 话题输入区域 */}
      <div className="glass border-b border-purple-400/30 p-5 relative"
           style={{
             background: 'linear-gradient(135deg, rgba(123, 47, 247, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)',
             boxShadow: '0 2px 10px rgba(123, 47, 247, 0.1)'
           }}>
        {/* 背景光效 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{
               background: 'linear-gradient(90deg, transparent, rgba(123, 47, 247, 0.15), transparent)',
               animation: 'float 5s ease-in-out infinite'
             }}></div>
        <div className="flex gap-3 mb-4 relative" style={{ zIndex: 50, pointerEvents: 'auto' }}>
          <input
            type="text"
            value={inputTopic}
            onChange={(e) => setInputTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="输入话题，例如：人工智能的未来发展"
            className="tech-input flex-1"
          />
          <button
            onClick={handleGenerate}
            onPointerUp={handleGenerate}
            disabled={isGenerating || !inputTopic.trim()}
            className="tech-button hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: isGenerating || !inputTopic.trim()
                ? 'linear-gradient(135deg, #666, #444)'
                : 'linear-gradient(135deg, #00d4ff, #7b2ff7)',
              boxShadow: !isGenerating && inputTopic.trim()
                ? '0 0 20px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(123, 47, 247, 0.2)'
                : 'none',
              position: 'relative'
            }}
          >
            {isGenerating ? (
              <>
                <span className="mr-2">⏳</span>
                <span>生成中...</span>
              </>
            ) : (
              <>
                <span className="mr-2">✨</span>
                <span>生成评论</span>
              </>
            )}
          </button>
        </div>

        {/* 自动生成设置 */}
        <div className="flex items-center justify-between text-sm relative" style={{ zIndex: 50, pointerEvents: 'auto' }}>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              disabled={!topic || !isRecording}
              className="w-5 h-5 accent-purple-400"
              style={{ 
                cursor: (!topic || !isRecording) ? 'not-allowed' : 'pointer',
                filter: 'drop-shadow(0 0 5px rgba(123, 47, 247, 0.5))'
              }}
            />
            <span className={!topic || !isRecording ? 'text-gray-300' : 'text-purple-200'}>
              💬 自动生成消息（仅在录制时生效）
            </span>
          </label>
          <div className="flex items-center gap-2">
            {autoGenerate && (
              <select
                value={generateInterval}
                onChange={(e) => setGenerateInterval(Number(e.target.value))}
                className="tech-input text-sm relative z-10"
                style={{ 
                  padding: '6px 12px', 
                  width: 'auto',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(123, 47, 247, 0.4)'
                }}
              >
                <option value={3000}>每3秒</option>
                <option value={5000}>每5秒</option>
                <option value={10000}>每10秒</option>
                <option value={15000}>每15秒</option>
              </select>
            )}
            {comments.length > 0 && (
              <button
                onClick={clearComments}
                className="px-3 py-1 text-cyan-200 hover:text-red-300 text-sm transition-colors relative z-10"
                style={{ 
                  textShadow: '0 0 10px currentColor'
                }}
                title="清空消息"
              >
                清空
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 text-red-400 text-sm relative z-10 glass px-3 py-2 rounded-lg border border-red-400/30"
               style={{ 
                 textShadow: '0 0 10px #ff006e',
                 boxShadow: '0 0 15px rgba(255, 0, 110, 0.2)'
               }}>
            {error}
          </div>
        )}

        {topic && (
          <div className="mt-3 text-sm text-purple-300 flex items-center gap-2 relative z-10">
            <span className="tech-indicator" style={{ width: '8px', height: '8px', background: '#7b2ff7', boxShadow: '0 0 10px #7b2ff7' }}></span>
            <span>当前话题: <span className="font-semibold text-purple-100">{topic}</span></span>
          </div>
        )}
      </div>

      {/* 聊天消息区域 */}
      <div 
        ref={commentsContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto tech-scrollbar relative"
        style={{ 
          background: 'radial-gradient(ellipse at top, rgba(0, 212, 255, 0.05) 0%, transparent 50%)'
        }}
      >
        <div className="grid-bg opacity-20"></div>
        {comments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-cyan-300/80 relative z-10">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">💬</div>
              <p className="text-lg mb-2 gradient-text">暂无消息</p>
              <p className="text-sm text-cyan-200/85">输入话题并点击"生成评论"开始聊天</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 space-y-4 relative z-10">
            {comments.map((comment, index) => {
              const previous = index > 0 ? comments[index - 1] : null
              const showTimeDivider = shouldShowTimeDivider(comment, previous)
              
              return (
                <div key={comment.id} className="animate-slideIn">
                  {/* 时间分隔线 */}
                  {showTimeDivider && (
                    <div className="flex justify-center my-4">
                      <div className="glass text-cyan-300 text-xs px-4 py-2 rounded-full">
                        {formatTime(comment.timestamp)}
                      </div>
                    </div>
                  )}
                  
                  {/* 消息气泡 */}
                  <div className="flex items-start gap-3 group hover-lift">
                    {/* 头像 */}
                    <div 
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #00d4ff, #7b2ff7)',
                        boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
                        border: '2px solid rgba(0, 212, 255, 0.3)'
                      }}
                    >
                      {comment.avatar || '👤'}
                    </div>
                    
                    {/* 消息内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-sm font-semibold text-cyan-200">{comment.author}</span>
                        <span className="text-xs text-cyan-200/70">{formatTime(comment.timestamp)}</span>
                      </div>
                      <div className="relative">
                        <div 
                          className="rounded-2xl rounded-tl-sm px-4 py-3 inline-block max-w-[80%] break-words hover-lift"
                          style={{
                            background: 'rgba(0, 5, 16, 0.96)',
                            border: '1px solid rgba(0, 240, 255, 0.35)',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 0 18px rgba(0, 240, 255, 0.12)',
                            backdropFilter: 'blur(2px)'
                          }}
                        >
                          <p className="text-white leading-relaxed text-sm whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                        {/* 消息尾巴 */}
                        <div 
                          className="absolute left-0 top-0 w-3 h-3 transform rotate-45 -translate-x-1.5 translate-y-3"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(0, 212, 255, 0.2)',
                            backdropFilter: 'blur(20px)'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={commentsEndRef} className="h-1" />
          </div>
        )}
        
        {/* 生成中提示 */}
        {isGenerating && autoGenerate && (
          <div className="px-4 pb-4 relative z-10">
            <div className="flex items-center gap-2 text-cyan-400 text-sm glass px-3 py-2 rounded-lg inline-block">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', boxShadow: '0 0 10px #00d4ff' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', boxShadow: '0 0 10px #00d4ff' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', boxShadow: '0 0 10px #00d4ff' }}></div>
              </div>
              <span>AI正在生成新消息...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
