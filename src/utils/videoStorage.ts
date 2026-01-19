// 视频存储管理

export interface VideoRecord {
  id: string
  filename: string
  topic: string
  blob: Blob
  url: string
  duration: number // 录制时长（秒）
  timestamp: number // 录制时间戳
  size: number // 文件大小（字节）
}

const STORAGE_KEY = 'video_records'
const MAX_STORAGE_SIZE = 500 * 1024 * 1024 // 最大存储500MB

/**
 * 获取所有视频记录
 */
export function getVideoRecords(): VideoRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const records = JSON.parse(stored)
    // 只返回元数据，不包含blob（因为localStorage无法存储大文件）
    return records.map((record: any) => ({
      ...record,
      // URL可能已失效，需要重新创建（但blob已丢失，所以这里只返回元数据）
      url: record.url || ''
    })).filter((record: any) => {
      // 过滤掉无效的记录
      return record.id && record.filename
    })
  } catch (error) {
    console.error('Error loading video records:', error)
    return []
  }
}

/**
 * 保存视频记录
 */
export function saveVideoRecord(record: Omit<VideoRecord, 'id' | 'url'>): string {
  const records = getVideoRecords()
  
  // 检查存储空间
  const totalSize = records.reduce((sum, r) => sum + r.size, 0)
  if (totalSize + record.size > MAX_STORAGE_SIZE) {
    // 删除最旧的记录
    records.sort((a, b) => a.timestamp - b.timestamp)
    const removed = records.shift()
    if (removed) {
      URL.revokeObjectURL(removed.url)
    }
  }
  
  const id = Date.now().toString()
  const url = URL.createObjectURL(record.blob)
  
  const newRecord: VideoRecord = {
    ...record,
    id,
    url
  }
  
  // 注意：localStorage无法直接存储Blob对象
  // 这里我们使用IndexedDB存储实际文件，localStorage只存储元数据
  // 为了简化，我们使用URL存储，但URL在页面刷新后会失效
  // 实际生产环境应该使用IndexedDB
  
  // 将Blob转换为base64存储（仅用于小文件，大文件建议使用IndexedDB）
  // 这里先只存储元数据和URL
  const recordToStore = {
    id: newRecord.id,
    filename: newRecord.filename,
    topic: newRecord.topic,
    duration: newRecord.duration,
    timestamp: newRecord.timestamp,
    size: newRecord.size,
    url: url // 存储URL（注意：页面刷新后会失效）
  }
  
  records.push(recordToStore as any)
  
  // 同时将Blob存储到IndexedDB（如果支持）
  if ('indexedDB' in window) {
    storeBlobInIndexedDB(newRecord.id, record.blob).catch(err => {
      console.warn('Failed to store video in IndexedDB:', err)
    })
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  
  return id
}

/**
 * 删除视频记录
 */
export async function deleteVideoRecord(id: string): Promise<boolean> {
  const records = getVideoRecords()
  const index = records.findIndex(r => r.id === id)
  
  if (index === -1) return false
  
  // 释放URL
  if (records[index].url) {
    URL.revokeObjectURL(records[index].url)
  }
  
  // 从IndexedDB删除
  if ('indexedDB' in window) {
    try {
      const request = indexedDB.open('VideoStorage', 1)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['videos'], 'readwrite')
        const store = transaction.objectStore('videos')
        store.delete(id)
      }
    } catch (error) {
      console.warn('Failed to delete video from IndexedDB:', error)
    }
  }
  
  records.splice(index, 1)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  
  return true
}

/**
 * 获取视频记录
 */
export function getVideoRecord(id: string): VideoRecord | null {
  const records = getVideoRecords()
  return records.find(r => r.id === id) || null
}

/**
 * 导出视频（下载）
 */
export async function exportVideo(record: VideoRecord): Promise<void> {
  let blob: Blob | null = null
  
  // 首先尝试从IndexedDB获取
  if ('indexedDB' in window) {
    blob = await getBlobFromIndexedDB(record.id).catch(() => null)
  }
  
  // 如果IndexedDB中没有，尝试使用URL
  if (!blob && record.url) {
    try {
      const response = await fetch(record.url)
      blob = await response.blob()
    } catch (error) {
      console.error('Failed to fetch video from URL:', error)
      alert('视频文件已失效，无法下载。请重新录制。')
      return
    }
  }
  
  if (!blob) {
    alert('视频文件不可用，无法下载。请重新录制。')
    return
  }
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = record.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

/**
 * 格式化时长
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 使用IndexedDB存储Blob（可选，用于持久化存储）
 */
async function storeBlobInIndexedDB(id: string, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VideoStorage', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['videos'], 'readwrite')
      const store = transaction.objectStore('videos')
      store.put(blob, id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos')
      }
    }
  })
}

/**
 * 从IndexedDB获取Blob
 */
export async function getBlobFromIndexedDB(id: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VideoStorage', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['videos'], 'readonly')
      const store = transaction.objectStore('videos')
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => resolve(getRequest.result || null)
      getRequest.onerror = () => reject(getRequest.error)
    }
    
    request.onupgradeneeded = () => {
      // 如果数据库不存在，创建它
      const db = request.result
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos')
      }
    }
  })
}
