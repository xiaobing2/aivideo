// 录制建议生成工具

export interface RecordingSuggestion {
  id: string
  type: 'question' | 'example' | 'compare' | 'detail' | 'experience' | 'summary'
  content: string
  icon: string
  priority: number // 1-5，数字越大优先级越高
}

/**
 * 根据评论内容生成录制建议
 */
export function generateSuggestion(comment: string): RecordingSuggestion | null {
  const lowerComment = comment.toLowerCase()
  
  // 检测问题类型
  if (lowerComment.includes('什么') || lowerComment.includes('？') || lowerComment.includes('?')) {
    return {
      id: Date.now().toString(),
      type: 'question',
      content: '可以详细解释一下这个概念',
      icon: '❓',
      priority: 4
    }
  }
  
  // 检测例子请求
  if (lowerComment.includes('例子') || lowerComment.includes('案例') || lowerComment.includes('举例') || 
      lowerComment.includes('比如') || lowerComment.includes('例如') || lowerComment.includes('示例')) {
    return {
      id: Date.now().toString(),
      type: 'example',
      content: '可以分享一个具体的实际案例',
      icon: '💡',
      priority: 5
    }
  }
  
  // 检测对比请求
  if (lowerComment.includes('区别') || lowerComment.includes('对比') || lowerComment.includes('比较') ||
      lowerComment.includes('不同') || lowerComment.includes('差异')) {
    return {
      id: Date.now().toString(),
      type: 'compare',
      content: '可以对比一下优缺点或不同方法',
      icon: '⚖️',
      priority: 4
    }
  }
  
  // 检测详细说明请求
  if (lowerComment.includes('详细') || lowerComment.includes('具体') || lowerComment.includes('深入') ||
      lowerComment.includes('展开') || lowerComment.includes('更多')) {
    return {
      id: Date.now().toString(),
      type: 'detail',
      content: '可以展开讲解更多细节',
      icon: '📝',
      priority: 3
    }
  }
  
  // 检测经验分享请求
  if (lowerComment.includes('经验') || lowerComment.includes('实践') || lowerComment.includes('应用') ||
      lowerComment.includes('使用') || lowerComment.includes('运用')) {
    return {
      id: Date.now().toString(),
      type: 'experience',
      content: '可以分享实际应用经验或使用场景',
      icon: '🎯',
      priority: 4
    }
  }
  
  // 检测总结请求
  if (lowerComment.includes('总结') || lowerComment.includes('概括') || lowerComment.includes('要点')) {
    return {
      id: Date.now().toString(),
      type: 'summary',
      content: '可以总结一下核心要点',
      icon: '📋',
      priority: 3
    }
  }
  
  // 如果没有匹配到特定类型，返回通用建议
  if (lowerComment.length > 10) {
    return {
      id: Date.now().toString(),
      type: 'detail',
      content: '可以针对这个话题展开讲解',
      icon: '💬',
      priority: 2
    }
  }
  
  return null
}

/**
 * 获取建议卡片的样式类
 */
export function getSuggestionStyle(type: RecordingSuggestion['type']): string {
  const styles = {
    question: 'bg-blue-500 border-blue-600',
    example: 'bg-green-500 border-green-600',
    compare: 'bg-purple-500 border-purple-600',
    detail: 'bg-orange-500 border-orange-600',
    experience: 'bg-pink-500 border-pink-600',
    summary: 'bg-indigo-500 border-indigo-600'
  }
  return styles[type] || 'bg-gray-500 border-gray-600'
}
