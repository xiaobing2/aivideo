import { useState, useEffect } from 'react'
import VideoRecorder from './components/VideoRecorder'
import CommentPanel from './components/CommentPanel'
import ApiKeySettings from './components/ApiKeySettings'
import VideoList from './components/VideoList'
import TopicHistory from './components/TopicHistory'
import Teleprompter from './components/Teleprompter'
import { hasApiKey } from './utils/apiKeyStorage'
import './App.css'

function App() {
  const [topic, setTopic] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showVideoList, setShowVideoList] = useState(false)
  const [showTopicHistory, setShowTopicHistory] = useState(false)
  const [showTeleprompter, setShowTeleprompter] = useState(false)
  const [videoListKey, setVideoListKey] = useState(0) // 用于强制刷新视频列表

  // 首次加载时检查是否有API密钥
  useEffect(() => {
    if (!hasApiKey()) {
      setShowSettings(true)
    }
  }, [])

  const handleVideoSaved = () => {
    setVideoListKey(prev => prev + 1) // 触发视频列表刷新
  }

  const handleSelectTopic = (selectedTopic: string) => {
    setTopic(selectedTopic)
  }

  // 处理新评论，传递给VideoRecorder生成建议
  const handleNewComment = (comment: string) => {
    // 通过自定义事件传递新评论
    window.dispatchEvent(new CustomEvent('new-comment', { detail: comment }))
  }

  return (
    <div className="flex h-screen relative tech-container overflow-hidden">
      {/* 3D背景 */}
      <div className="particles-bg"></div>
      
      {/* 3D几何装饰 - 左侧 */}
      <div className="absolute top-20 left-10 w-40 h-40 border-2 border-cyan-400 rotate-45 animate-float z-0 pointer-events-none" 
           style={{ 
             borderColor: 'rgba(0, 240, 255, 0.8)',
             boxShadow: '0 0 60px rgba(0, 240, 255, 0.6), inset 0 0 40px rgba(0, 240, 255, 0.3)',
             animation: 'float 8s ease-in-out infinite',
             background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), transparent)',
             clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
           }}></div>
      
      {/* 3D几何装饰 - 右侧 */}
      <div className="absolute bottom-20 right-10 w-32 h-32 border-2 border-purple-400 rotate-12 animate-float z-0 pointer-events-none"
           style={{ 
             borderColor: 'rgba(139, 92, 246, 0.8)',
             boxShadow: '0 0 50px rgba(139, 92, 246, 0.6), inset 0 0 30px rgba(139, 92, 246, 0.3)',
             animation: 'float 6s ease-in-out infinite',
             animationDelay: '1s',
             background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), transparent)'
           }}></div>
      
      {/* 3D几何装饰 - 中心 */}
      <div className="absolute top-1/2 left-1/4 w-20 h-20 border-2 border-pink-400 rounded-full animate-pulse z-0 pointer-events-none"
           style={{ 
             borderColor: 'rgba(255, 0, 128, 0.8)',
             boxShadow: '0 0 45px rgba(255, 0, 128, 0.6), inset 0 0 25px rgba(255, 0, 128, 0.3)',
             transform: 'translate(-50%, -50%)',
             background: 'radial-gradient(circle, rgba(255, 0, 128, 0.2), transparent)'
           }}></div>
      
      {/* 3D几何装饰 - 右上 */}
      <div className="absolute top-32 right-32 w-24 h-24 border-2 border-cyan-400 rotate-45 z-0 pointer-events-none"
           style={{ 
             borderColor: 'rgba(0, 240, 255, 0.6)',
             boxShadow: '0 0 40px rgba(0, 240, 255, 0.5)',
             animation: 'float 7s ease-in-out infinite',
             animationDelay: '2s',
             clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
           }}></div>
      
      {/* 光效扫描线 */}
      <div className="absolute inset-0 pointer-events-none z-0"
           style={{
             background: 'linear-gradient(180deg, transparent 0%, rgba(0, 240, 255, 0.08) 50%, transparent 100%)',
             animation: 'float 10s ease-in-out infinite',
             boxShadow: 'inset 0 0 300px rgba(0, 240, 255, 0.03)'
           }}></div>
      
      {/* 中央分隔线 - 3D效果 */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 z-10"
           style={{
             background: 'linear-gradient(180deg, transparent 0%, rgba(0, 240, 255, 1) 20%, rgba(139, 92, 246, 1) 50%, rgba(255, 0, 128, 1) 80%, transparent 100%)',
             boxShadow: 
               '0 0 40px rgba(0, 240, 255, 0.8), ' +
               '0 0 80px rgba(139, 92, 246, 0.6), ' +
               '0 0 120px rgba(255, 0, 128, 0.4)',
             transform: 'translateX(-50%)',
             animation: 'glow 3s ease-in-out infinite'
           }}>
        {/* 分隔线光点 */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-cyan-400 rounded-full"
             style={{
               transform: 'translate(-50%, -50%)',
               boxShadow: 
                 '0 0 20px rgba(0, 240, 255, 1), ' +
                 '0 0 40px rgba(0, 240, 255, 0.8), ' +
                 '0 0 60px rgba(0, 240, 255, 0.6)',
               animation: 'pulse 2s ease-in-out infinite',
               border: '1px solid rgba(0, 240, 255, 0.5)'
             }}></div>
      </div>

      {/* 左侧视频录制区域（简化容器，避免 3D 图层影响点击） */}
      <div className="w-1/2 relative p-6">
        <div className="h-full bg-transparent relative">
          <VideoRecorder 
            topic={topic}
            onRecordingChange={setIsRecording}
            onVideoSaved={handleVideoSaved}
            onShowTeleprompter={() => setShowTeleprompter(true)}
          />
        </div>
      </div>
      
      {/* 右侧评论生成区域（简化容器，避免 3D 图层影响点击） */}
      <div className="w-1/2 relative p-6">
        <div className="h-full bg-transparent relative">
          <CommentPanel 
            topic={topic}
            onTopicChange={setTopic}
            isRecording={isRecording}
            onShowTopicHistory={() => setShowTopicHistory(true)}
            onShowVideoList={() => setShowVideoList(true)}
            onShowSettings={() => setShowSettings(true)}
            onNewComment={handleNewComment}
          />
        </div>
      </div>

      {/* API密钥设置对话框 */}
      <ApiKeySettings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* 视频列表对话框 */}
      <VideoList 
        key={videoListKey}
        isOpen={showVideoList}
        onClose={() => setShowVideoList(false)}
        onRefresh={() => setVideoListKey(prev => prev + 1)}
      />

      {/* 话题历史对话框 */}
      <TopicHistory
        isOpen={showTopicHistory}
        onClose={() => setShowTopicHistory(false)}
        onSelectTopic={handleSelectTopic}
      />

      {/* 提词器对话框 */}
      <Teleprompter
        isVisible={showTeleprompter}
        onClose={() => setShowTeleprompter(false)}
        topic={topic}
      />
    </div>
  )
}

export default App
