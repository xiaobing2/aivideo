import { useState, useEffect } from 'react'
import { getApiKey, saveApiKey } from '../utils/apiKeyStorage'

interface ApiKeySettingsProps {
  isOpen: boolean
  onClose: () => void
}

export default function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setApiKey(getApiKey())
    }
  }, [isOpen])

  const handleSave = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim())
      onClose()
    }
  }

  const handleClear = () => {
    setApiKey('')
    saveApiKey('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 tech-container">
      <div className="tech-card p-6 w-full max-w-md mx-4 animate-3d-in" style={{ border: '2px solid rgba(0, 240, 255, 0.5)' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-100 neon-text">配置千问API密钥</h2>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-cyan-300 mb-2">
            API密钥
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入千问API密钥"
              className="tech-input w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="glass border border-cyan-400/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-cyan-300 mb-2">
            <strong className="gradient-text">如何获取API密钥：</strong>
          </p>
          <ol className="text-sm text-cyan-200/80 mt-2 list-decimal list-inside space-y-1">
            <li>访问 <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">阿里云DashScope控制台</a></li>
            <li>注册/登录账号</li>
            <li>进入"API-KEY管理"页面</li>
            <li>创建新的API密钥并复制</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="tech-button hover-lift flex-1"
          >
            保存
          </button>
          <button
            onClick={handleClear}
            className="tech-button hover-lift"
            style={{ background: 'linear-gradient(135deg, #ff006e, #7b2ff7)' }}
          >
            清除
          </button>
          <button
            onClick={onClose}
            className="tech-button hover-lift"
            style={{ background: 'linear-gradient(135deg, #666, #444)' }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
