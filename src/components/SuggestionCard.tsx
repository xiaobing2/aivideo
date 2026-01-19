import { useEffect, useState } from 'react'
import { RecordingSuggestion } from '../utils/suggestionGenerator'

interface SuggestionCardProps {
  suggestion: RecordingSuggestion
  onDismiss: (id: string) => void
  autoHide?: boolean
  duration?: number // 自动隐藏时长（毫秒）
}

export default function SuggestionCard({ 
  suggestion, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}: SuggestionCardProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => {
          setIsVisible(false)
          onDismiss(suggestion.id)
        }, 300) // 动画时长
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [autoHide, duration, suggestion.id, onDismiss])

  if (!isVisible) return null

  // 根据类型设置颜色
  const getColorStyle = () => {
    const colors = {
      question: { bg: 'rgba(0, 212, 255, 0.2)', border: 'rgba(0, 212, 255, 0.5)', glow: '0, 212, 255' },
      example: { bg: 'rgba(0, 255, 136, 0.2)', border: 'rgba(0, 255, 136, 0.5)', glow: '0, 255, 136' },
      compare: { bg: 'rgba(123, 47, 247, 0.2)', border: 'rgba(123, 47, 247, 0.5)', glow: '123, 47, 247' },
      detail: { bg: 'rgba(255, 184, 0, 0.2)', border: 'rgba(255, 184, 0, 0.5)', glow: '255, 184, 0' },
      experience: { bg: 'rgba(255, 0, 110, 0.2)', border: 'rgba(255, 0, 110, 0.5)', glow: '255, 0, 110' },
      summary: { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.5)', glow: '99, 102, 241' }
    }
    return colors[suggestion.type] || colors.question
  }

  const colorStyle = getColorStyle()

  return (
    <div
      className={`
        glass
        text-white 
        rounded-lg 
        p-4 
        mb-3 
        transform 
        transition-all 
        duration-300
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-slideInRight
        max-w-sm
        cursor-pointer
        hover-lift
      `}
      style={{
        background: colorStyle.bg,
        border: `1px solid ${colorStyle.border}`,
        boxShadow: `0 4px 20px rgba(${colorStyle.glow}, 0.3), 0 0 20px rgba(${colorStyle.glow}, 0.2)`
      }}
      onClick={() => {
        setIsExiting(true)
        setTimeout(() => {
          setIsVisible(false)
          onDismiss(suggestion.id)
        }, 300)
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{suggestion.icon}</div>
        <div className="flex-1">
          <p className="font-semibold text-sm leading-relaxed text-cyan-50">{suggestion.content}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExiting(true)
            setTimeout(() => {
              setIsVisible(false)
              onDismiss(suggestion.id)
            }, 300)
          }}
          className="text-cyan-300 hover:text-red-400 flex-shrink-0 transition-colors text-lg"
        >
          ×
        </button>
      </div>
    </div>
  )
}
