import { useState, useEffect } from 'react'
import { 
  getVideoRecords, 
  deleteVideoRecord, 
  exportVideo, 
  formatFileSize, 
  formatDuration,
  getBlobFromIndexedDB,
  type VideoRecord 
} from '../utils/videoStorage'

interface VideoListProps {
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
}

export default function VideoList({ isOpen, onClose, onRefresh }: VideoListProps) {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      loadVideos()
    }
  }, [isOpen])
  
  useEffect(() => {
    return () => {
      // 清理URL
      Object.values(videoUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [videoUrls])

  const loadVideos = async () => {
    const records = getVideoRecords()
    const sorted = records.sort((a, b) => b.timestamp - a.timestamp)
    setVideos(sorted)
    
    // 为每个视频加载URL（从IndexedDB或使用现有URL）
    const urls: Record<string, string> = {}
    for (const record of sorted) {
      if (record.url && record.url.startsWith('blob:')) {
        // 检查URL是否仍然有效
        try {
          await fetch(record.url, { method: 'HEAD' })
          urls[record.id] = record.url
        } catch {
          // URL已失效，尝试从IndexedDB加载
          if ('indexedDB' in window) {
            const blob = await getBlobFromIndexedDB(record.id).catch(() => null)
            if (blob) {
              urls[record.id] = URL.createObjectURL(blob)
            }
          }
        }
      } else if ('indexedDB' in window) {
        // 尝试从IndexedDB加载
        const blob = await getBlobFromIndexedDB(record.id).catch(() => null)
        if (blob) {
          urls[record.id] = URL.createObjectURL(blob)
        }
      }
    }
    setVideoUrls(urls)
  }

  const handleDelete = async (id: string) => {
    if (await deleteVideoRecord(id)) {
      // 清理URL
      if (videoUrls[id]) {
        URL.revokeObjectURL(videoUrls[id])
      }
      const newUrls = { ...videoUrls }
      delete newUrls[id]
      setVideoUrls(newUrls)
      
      loadVideos()
      if (selectedVideo?.id === id) {
        setSelectedVideo(null)
      }
      if (onRefresh) {
        onRefresh()
      }
    }
    setShowDeleteConfirm(null)
  }

  const handleExport = async (video: VideoRecord) => {
    await exportVideo(video)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 tech-container">
      <div className="tech-card w-full max-w-6xl h-[90vh] mx-4 flex flex-col animate-3d-in" style={{ border: '2px solid rgba(0, 240, 255, 0.5)' }}>
        {/* 标题栏 */}
        <div className="glass border-b border-white/10 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-cyan-100 neon-text">视频列表</h2>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧视频列表 */}
          <div className="w-1/2 border-r border-white/10 overflow-y-auto tech-scrollbar">
            {videos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-cyan-400/60">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">🎥</div>
                  <p className="text-lg mb-2 gradient-text">暂无录制视频</p>
                  <p className="text-sm text-cyan-300/70">开始录制后，视频会显示在这里</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`glass rounded-lg p-4 cursor-pointer transition-all hover-lift ${
                      selectedVideo?.id === video.id
                        ? 'border-2 border-cyan-400 shadow-lg shadow-cyan-400/30'
                        : 'border border-white/10'
                    }`}
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-cyan-200 truncate flex-1">
                        {video.topic}
                      </h3>
                      {showDeleteConfirm === video.id ? (
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(video.id)
                            }}
                            className="text-red-400 text-xs px-2 py-1 hover:bg-red-500/20 rounded transition-colors"
                          >
                            确认
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(null)
                            }}
                            className="text-cyan-300 text-xs px-2 py-1 hover:bg-cyan-500/20 rounded transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(video.id)
                          }}
                          className="text-red-400 hover:text-red-300 ml-2 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-cyan-300/70 space-y-1">
                      <p>时长: <span className="text-cyan-200">{formatDuration(video.duration)}</span></p>
                      <p>大小: <span className="text-cyan-200">{formatFileSize(video.size)}</span></p>
                      <p>时间: <span className="text-cyan-200">{new Date(video.timestamp).toLocaleString()}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧视频预览和操作 */}
          <div className="w-1/2 flex flex-col">
            {selectedVideo ? (
              <>
                <div className="flex-1 bg-black/50 flex items-center justify-center p-4 relative">
                  <div className="grid-bg opacity-20"></div>
                  {videoUrls[selectedVideo.id] ? (
                    <video
                      src={videoUrls[selectedVideo.id]}
                      controls
                      className="max-w-full max-h-full relative z-10 rounded-lg"
                      style={{ 
                        boxShadow: '0 0 40px rgba(0, 212, 255, 0.3)',
                        border: '2px solid rgba(0, 212, 255, 0.3)'
                      }}
                    />
                  ) : (
                    <div className="text-cyan-300 text-center relative z-10">
                      <p className="text-lg mb-2">视频文件不可用</p>
                      <p className="text-sm text-cyan-400/60">可能已过期，请重新录制</p>
                    </div>
                  )}
                </div>
                <div className="glass border-t border-white/10 p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-cyan-300 mb-1">话题</h3>
                    <p className="text-cyan-100">{selectedVideo.topic}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-cyan-400/70">时长:</span>
                      <span className="ml-2 font-semibold text-cyan-200">
                        {formatDuration(selectedVideo.duration)}
                      </span>
                    </div>
                    <div>
                      <span className="text-cyan-400/70">大小:</span>
                      <span className="ml-2 font-semibold text-cyan-200">
                        {formatFileSize(selectedVideo.size)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-cyan-400/70">录制时间:</span>
                      <span className="ml-2 text-cyan-200">
                        {new Date(selectedVideo.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleExport(selectedVideo)}
                      disabled={!videoUrls[selectedVideo.id]}
                      className="tech-button hover-lift flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下载视频
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(selectedVideo.id)
                      }}
                      className="tech-button hover-lift"
                      style={{ background: 'linear-gradient(135deg, #ff006e, #7b2ff7)' }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-cyan-400/60">
                <p>请选择一个视频查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
