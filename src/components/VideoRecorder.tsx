import { useEffect, useMemo, useRef, useState } from 'react'
import { saveVideoRecord } from '../utils/videoStorage'
import { generateSuggestion, type RecordingSuggestion } from '../utils/suggestionGenerator'
import SuggestionCard from './SuggestionCard'
import RecorderControls from './RecorderControls'

interface VideoRecorderProps {
  topic: string
  onRecordingChange: (isRecording: boolean) => void
  onVideoSaved?: () => void
  onShowTeleprompter?: () => void
}

export default function VideoRecorder({ topic, onRecordingChange, onVideoSaved, onShowTeleprompter }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const [isInitializing, setIsInitializing] = useState(false)
  const [showTeleprompterOverlay, setShowTeleprompterOverlay] = useState(false)
  const [teleprompterContent, setTeleprompterContent] = useState<string>('')
  const [teleprompterScrollSpeed, setTeleprompterScrollSpeed] = useState(0)
  const teleprompterRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<number | null>(null)
  const [suggestions, setSuggestions] = useState<RecordingSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  const preferredMimeTypes = useMemo(
    () => [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ],
    []
  )

  const pickSupportedMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined') return undefined
    for (const t of preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return undefined
  }

  const initCamera = async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持摄像头录制')
      return null
    }
    setIsInitializing(true)
    setError('')
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      return mediaStream
    } catch (err) {
      setError('无法访问摄像头或麦克风，请检查权限设置（浏览器地址栏左侧图标）')
      console.error('Error accessing media devices:', err)
      return null
    } finally {
      setIsInitializing(false)
    }
  }

  // 初始化摄像头
  useEffect(() => {
    void initCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 录制时间计时（仅在录制时增加）
  useEffect(() => {
    let interval: number | null = null
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 加载提词器内容
  useEffect(() => {
    if (topic) {
      const saved = localStorage.getItem(`teleprompter_outline_${topic}`)
      if (saved) {
        setTeleprompterContent(saved)
      }
    }
  }, [topic])

  // 监听提词器内容变化（从Teleprompter组件）
  useEffect(() => {
    const handleTeleprompterUpdate = () => {
      if (topic) {
        const saved = localStorage.getItem(`teleprompter_outline_${topic}`)
        if (saved) {
          setTeleprompterContent(saved)
        }
      }
    }
    
    window.addEventListener('teleprompter-saved', handleTeleprompterUpdate)
    return () => window.removeEventListener('teleprompter-saved', handleTeleprompterUpdate)
  }, [topic])

  // 监听新评论，生成建议
  useEffect(() => {
    const handleNewComment = (event: CustomEvent<string>) => {
      const comment = event.detail
      const suggestion = generateSuggestion(comment)
      
      if (suggestion) {
        setSuggestions(prev => {
          // 限制最多显示3条建议
          const newSuggestions = [suggestion, ...prev].slice(0, 3)
          return newSuggestions
        })
      }
    }
    
    window.addEventListener('new-comment' as any, handleNewComment as EventListener)
    return () => window.removeEventListener('new-comment' as any, handleNewComment as EventListener)
  }, [])

  // 移除建议
  const handleDismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  // 自动滚动提词器
  useEffect(() => {
    if (showTeleprompterOverlay && teleprompterScrollSpeed > 0 && teleprompterRef.current) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (teleprompterRef.current) {
          const container = teleprompterRef.current
          const maxScroll = container.scrollHeight - container.clientHeight
          const currentScroll = container.scrollTop
          
          if (currentScroll < maxScroll) {
            container.scrollTop = currentScroll + teleprompterScrollSpeed * 0.5
          } else {
            // 到达底部，重置到顶部
            container.scrollTop = 0
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
      }
    }
  }, [showTeleprompterOverlay, teleprompterScrollSpeed])

  // 开始录制
  const startRecording = async () => {
    let activeStream = stream
    if (!activeStream) {
      activeStream = await initCamera()
    }
    if (!activeStream) return

    try {
      chunksRef.current = []
      const mimeType = pickSupportedMimeType()
      const mediaRecorder = mimeType ? new MediaRecorder(activeStream, { mimeType }) : new MediaRecorder(activeStream)

      mediaRecorder.onstart = () => {
        setIsRecording(true)
        setRecordingTime(0)
        onRecordingChange(true)
        setError('')
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const timestamp = Date.now()
        const filename = `录制_${topic || '未命名'}_${timestamp}.webm`

        try {
          saveVideoRecord({
            filename,
            topic: topic || '未命名',
            blob,
            duration: recordingTime,
            timestamp,
            size: blob.size
          })

          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          if (onVideoSaved) {
            onVideoSaved()
          }
        } catch (error) {
          console.error('Error saving video:', error)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
    } catch (err) {
      setError('录制启动失败')
      console.error('Error starting recording:', err)
    }
  }

  // 停止录制
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      onRecordingChange(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent relative" style={{ pointerEvents: 'auto' }}>
      {/* 标题栏 */}
      <div
        className="glass p-5 flex justify-between items-center border-b border-cyan-400/30 relative"
        style={{
          pointerEvents: 'auto',
          zIndex: 50,
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%)',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.1), inset 0 1px 0 rgba(0, 212, 255, 0.2)'
        }}
      >
        {/* 背景光效 */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{
               background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.2), transparent)',
               animation: 'float 3s ease-in-out infinite'
             }}></div>
        
        <div className="relative z-20">
          <h1 className="text-2xl font-bold gradient-text neon-text" style={{ fontSize: '24px' }}>视频录制</h1>
          {topic && (
            <p className="text-sm text-cyan-200 mt-2 flex items-center gap-2">
              <span className="tech-indicator" style={{ width: '10px', height: '10px' }}></span>
              <span className="text-cyan-100">话题: <span className="text-white font-semibold">{topic}</span></span>
            </p>
          )}
        </div>
        {onShowTeleprompter && (
          <button
            type="button"
            onClick={onShowTeleprompter}
            onPointerUp={onShowTeleprompter}
            className="tech-button toolbar-button hover-lift text-sm"
            title="打开提词器"
          >
            📝 提词器
          </button>
        )}
      </div>

      {/* 视频预览区域 */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
           style={{
             background: 'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.05) 0%, rgba(0, 0, 0, 0.5) 100%)'
           }}
      >
        <div className="grid-bg pointer-events-none"></div>
        
        {/* 3D边框装饰 */}
        <div className="absolute inset-4 pointer-events-none z-0"
             style={{
               border: '2px solid rgba(0, 212, 255, 0.2)',
               borderRadius: '16px',
               boxShadow: 'inset 0 0 60px rgba(0, 212, 255, 0.1), 0 0 40px rgba(0, 212, 255, 0.2)'
             }}></div>
        
        {error ? (
          <div className="text-red-400 text-center p-4 z-10 relative">
            <div className="glass rounded-lg p-6 border border-red-400/30"
                 style={{ boxShadow: '0 0 30px rgba(255, 0, 110, 0.3)' }}>
              <p className="neon-text text-lg mb-4" style={{ textShadow: '0 0 20px #ff006e' }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="tech-button hover-lift"
                style={{ 
                  background: 'linear-gradient(135deg, #ff006e, #7b2ff7)',
                  boxShadow: '0 0 20px rgba(255, 0, 110, 0.4)'
                }}
              >
                重新加载
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain rounded-xl relative"
              style={{ 
                boxShadow: 
                  '0 0 60px rgba(0, 212, 255, 0.4), ' +
                  '0 0 100px rgba(0, 212, 255, 0.2), ' +
                  'inset 0 0 40px rgba(0, 212, 255, 0.1)',
                border: '3px solid rgba(0, 212, 255, 0.4)',
                filter: 'drop-shadow(0 0 20px rgba(0, 212, 255, 0.5))'
              }}
            />
            {/* 视频边框光效 */}
            <div className="absolute inset-0 rounded-xl pointer-events-none"
                 style={{
                   border: '1px solid rgba(0, 212, 255, 0.6)',
                   borderRadius: '12px',
                   boxShadow: 'inset 0 0 30px rgba(0, 212, 255, 0.2)',
                   animation: 'glow 3s ease-in-out infinite'
                 }}></div>
          </div>
        )}
        
        {/* 录制状态指示 */}
        {isRecording && (
          <div className="absolute top-6 left-6 flex items-center gap-3 glass px-4 py-2 rounded-lg z-20 neon-border">
            <div className="tech-indicator" style={{ background: '#ff006e', boxShadow: '0 0 10px #ff006e, 0 0 20px #ff006e' }}></div>
            <span className="font-mono text-cyan-400 font-bold text-lg">{formatTime(recordingTime)}</span>
          </div>
        )}
        
        {/* 提词器叠加显示 */}
        {showTeleprompterOverlay && teleprompterContent && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="w-full h-full flex flex-col glass">
              {/* 控制栏 */}
              <div className="glass border-b border-white/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-cyan-300 text-sm font-semibold">📝 提词器</span>
                  <div className="flex items-center gap-2">
                    <label className="text-cyan-300 text-xs">速度:</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={teleprompterScrollSpeed}
                      onChange={(e) => setTeleprompterScrollSpeed(Number(e.target.value))}
                      className="w-20 accent-cyan-400"
                    />
                    <span className="text-cyan-300 text-xs w-8">
                      {teleprompterScrollSpeed === 0 ? '手动' : `${teleprompterScrollSpeed}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeleprompterOverlay(false)}
                  className="tech-button text-sm"
                  style={{ 
                    background: 'linear-gradient(135deg, #ff006e, #7b2ff7)',
                    padding: '6px 16px'
                  }}
                >
                  关闭
                </button>
              </div>
              
              {/* 滚动内容 */}
              <div
                ref={teleprompterRef}
                className="flex-1 overflow-y-auto tech-scrollbar px-8 py-12"
                style={{
                  scrollBehavior: teleprompterScrollSpeed > 0 ? 'auto' : 'smooth'
                }}
              >
                <div
                  className="text-cyan-100 leading-relaxed whitespace-pre-wrap text-center"
                  style={{ 
                    fontSize: '32px',
                    lineHeight: '1.8',
                    textShadow: '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.3)'
                  }}
                >
                  {teleprompterContent}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 显示提词器按钮（当有内容时） */}
        {teleprompterContent && !showTeleprompterOverlay && (
          <button
            onClick={() => setShowTeleprompterOverlay(true)}
            className="tech-button hover-lift absolute bottom-6 right-6 z-30 text-sm"
            title="显示提词器"
          >
            <span className="mr-2">📝</span>
            <span>显示大纲</span>
          </button>
        )}

        {/* 录制建议卡片 */}
        {showSuggestions && suggestions.length > 0 && !showTeleprompterOverlay && (
          <div className="absolute top-24 right-6 z-30 max-w-sm">
            <div className="glass rounded-lg p-3 mb-2 flex items-center justify-between border border-cyan-400/30">
              <span className="text-cyan-300 text-xs font-semibold">💡 录制建议</span>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-cyan-300 hover:text-red-400 text-xs transition-colors"
              >
                隐藏
              </button>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onDismiss={handleDismissSuggestion}
                  autoHide={true}
                  duration={8000}
                />
              ))}
            </div>
          </div>
        )}

        {/* 显示建议按钮（当建议被隐藏时） */}
        {!showSuggestions && suggestions.length > 0 && !showTeleprompterOverlay && (
          <button
            onClick={() => setShowSuggestions(true)}
            className="tech-button hover-lift absolute top-24 right-6 z-30 text-sm"
            style={{ 
              background: 'linear-gradient(135deg, #ffb800, #ff8800)',
              padding: '10px 20px'
            }}
            title="显示建议"
          >
            <span className="mr-2">💡</span>
            <span>显示建议 ({suggestions.length})</span>
          </button>
        )}
      </div>

      <RecorderControls
        isRecording={isRecording}
        isInitializing={isInitializing}
        onStart={() => void startRecording()}
        onStop={stopRecording}
      />
    </div>
  )
}
