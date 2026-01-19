// 千问API服务
import { getApiKey } from './apiKeyStorage'

const QIANWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

interface QianwenResponse {
  output: {
    choices: Array<{
      message: {
        content: string
      }
    }>
  }
}

/**
 * 调用千问API生成评论
 * @param topic 话题
 * @param count 生成评论数量
 * @returns 评论内容数组
 */
export async function generateComments(topic: string, count: number = 5): Promise<string[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('请先配置千问API密钥，点击右上角设置按钮进行配置')
  }

  const comments: string[] = []

  // 为每条评论生成不同的提示词 - 更真实多样，包含分享、讨论等类型
  const prompts = [
    // 提问类
    `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条评论。要求：1. 提出一个具体的问题或疑问 2. 语言自然口语化，像真实用户在说话 3. 不要使用"可以"、"能否"等正式词汇 4. 长度在15-40字之间。只输出评论内容，不要其他解释。`,
    
    // 分享经验类
    `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条分享个人经验的评论。要求：1. 分享你的实际经历或看法 2. 语言真实自然，像在和朋友聊天 3. 可以表达赞同、质疑或补充 4. 长度在20-50字之间。只输出评论内容，不要其他解释。`,
    
    // 讨论类
    `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条参与讨论的评论。要求：1. 表达你的观点或想法 2. 语言口语化，自然流畅 3. 可以表示赞同、反对或补充 4. 长度在15-45字之间。只输出评论内容，不要其他解释。`,
    
    // 请求例子类
    `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条请求例子的评论。要求：1. 请求具体的例子或案例 2. 语言自然友好，不要太正式 3. 像在询问朋友一样 4. 长度在15-35字之间。只输出评论内容，不要其他解释。`,
    
    // 对比类
    `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条对比或比较的评论。要求：1. 提出对比或比较的请求 2. 语言自然 3. 能引导深入分析 4. 长度在15-40字之间。只输出评论内容，不要其他解释。`,
  ]

  // 生成多条评论
  for (let i = 0; i < count; i++) {
    try {
      const prompt = prompts[i % prompts.length]
      const response = await fetch(QIANWEN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo', // 或使用其他模型如 qwen-plus, qwen-max
          input: {
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            temperature: 1.0, // 提高温度增加多样性
            max_tokens: 200,
            top_p: 0.9, // 增加随机性
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败: ${response.status} - ${errorText}`)
      }

      const data: QianwenResponse = await response.json()
      const content = data.output?.choices?.[0]?.message?.content?.trim()
      
      if (content && content.length > 0) {
        // 清理可能包含的引号、换行符或其他格式
        let cleanContent = content
          .replace(/^["'「」『』]|["'「」『』]$/g, '') // 移除首尾引号
          .replace(/\n+/g, ' ') // 替换换行为空格
          .replace(/\s+/g, ' ') // 合并多个空格
          .trim()
        
        // 移除常见的AI回复前缀
        cleanContent = cleanContent.replace(/^(好的|明白了|关于|针对).*?[，,]\s*/i, '')
        
        if (cleanContent.length > 0 && cleanContent.length <= 100) {
          comments.push(cleanContent)
        } else {
          throw new Error('API返回内容为空或过长')
        }
      } else {
        throw new Error('API返回格式错误')
      }
    } catch (error: any) {
      console.error(`生成第${i + 1}条评论失败:`, error)
      // 如果是API密钥问题，直接抛出错误
      if (error?.message?.includes('API密钥') || error?.message?.includes('401') || error?.message?.includes('403')) {
        throw new Error('API密钥无效或已过期，请检查设置')
      }
      // 其他错误使用备用评论
      comments.push(getFallbackComment(topic, i + Math.floor(Math.random() * 10)))
    }

    // 避免请求过快
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return comments
}

/**
 * 备用评论生成（当API不可用时）- 生成更真实多样的评论
 */
function getFallbackComment(topic: string, index: number): string {
  // 更真实的评论模板，包含提问、分享、讨论等多种类型
  const fallbackComments = [
    // 提问类（30%）
    `${topic}具体是指什么？能举个例子吗？`,
    `关于${topic}，有哪些实际应用场景？`,
    `${topic}和传统方法有什么区别？`,
    `能详细说说${topic}的核心要点吗？`,
    
    // 分享经验类（25%）
    `我之前也遇到过${topic}的问题，感觉确实很重要。`,
    `关于${topic}，我的经验是确实需要重视。`,
    `${topic}这个我深有体会，在工作中经常用到。`,
    `我在实践中发现${topic}确实有效果。`,
    
    // 讨论类（25%）
    `我觉得${topic}确实值得深入讨论。`,
    `对于${topic}，我有不同的看法。`,
    `${topic}这个观点我同意，但还想补充一点。`,
    `关于${topic}，我觉得还可以从另一个角度考虑。`,
    
    // 请求例子类（10%）
    `能分享一些${topic}的实际案例吗？`,
    `有没有${topic}的具体例子？`,
    
    // 对比类（5%）
    `${topic}和传统方法相比有什么优势？`,
    
    // 补充类（5%）
    `${topic}这个点很重要，还想了解更多细节。`,
    `关于${topic}，我觉得还可以补充一些内容。`,
  ]
  
  // 使用时间戳和索引确保随机性
  const seed = (Date.now() + index * 1000) % fallbackComments.length
  return fallbackComments[seed]
}

/**
 * 生成单条评论（用于自动生成）
 */
export async function generateSingleComment(topic: string): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('请先配置千问API密钥，点击右上角设置按钮进行配置')
  }

  try {
    // 随机选择一种评论类型，增加多样性和真实性
    const commentTypes = [
      // 提问类（30%）
      `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条评论。要求：1. 提出一个具体的问题或疑问 2. 语言自然口语化，像真实用户在说话 3. 不要使用"可以"、"能否"等正式词汇 4. 长度在15-40字之间。只输出评论内容，不要其他解释。`,
      
      // 分享经验类（25%）
      `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条分享个人经验的评论。要求：1. 分享你的实际经历或看法 2. 语言真实自然，像在和朋友聊天 3. 可以表达赞同、质疑或补充 4. 长度在20-50字之间。只输出评论内容，不要其他解释。`,
      
      // 讨论类（20%）
      `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条参与讨论的评论。要求：1. 表达你的观点或想法 2. 语言口语化，自然流畅 3. 可以表示赞同、反对或补充 4. 长度在15-45字之间。只输出评论内容，不要其他解释。`,
      
      // 请求例子类（15%）
      `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条请求例子的评论。要求：1. 请求具体的例子或案例 2. 语言自然友好，不要太正式 3. 像在询问朋友一样 4. 长度在15-35字之间。只输出评论内容，不要其他解释。`,
      
      // 对比类（10%）
      `你是一个视频评论区的真实用户，针对"${topic}"这个话题，写一条对比或比较的评论。要求：1. 提出对比或比较的请求 2. 语言自然 3. 能引导深入分析 4. 长度在15-40字之间。只输出评论内容，不要其他解释。`,
    ]
    
    // 根据权重随机选择（不是完全随机）
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]
    let random = Math.random()
    let selectedIndex = 0
    let cumulative = 0
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i]
      if (random <= cumulative) {
        selectedIndex = i
        break
      }
    }
    
    const randomPrompt = commentTypes[selectedIndex]
    
    const response = await fetch(QIANWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'user',
              content: randomPrompt
            }
          ]
        },
        parameters: {
          temperature: 1.0, // 提高温度增加多样性
          max_tokens: 150,
          top_p: 0.9, // 增加随机性
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API错误:', response.status, errorText)
      // 如果是认证错误，抛出
      if (response.status === 401 || response.status === 403) {
        throw new Error('API密钥无效或已过期，请检查设置')
      }
      throw new Error(`API请求失败: ${response.status}`)
    }

    const data: QianwenResponse = await response.json()
    let content = data.output?.choices?.[0]?.message?.content?.trim()
    
    if (content && content.length > 0) {
      // 清理可能包含的引号、换行符或其他格式
      content = content
        .replace(/^["'「」『』]|["'「」『』]$/g, '') // 移除首尾引号
        .replace(/\n+/g, ' ') // 替换换行为空格
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim()
      
      // 移除常见的AI回复前缀
      content = content.replace(/^(好的|明白了|关于|针对).*?[，,]\s*/i, '')
      
      if (content.length > 0 && content.length <= 100) {
        return content
      }
    }
    
    // 如果API返回失败，使用备用评论
    return getFallbackComment(topic, Math.floor(Math.random() * 20))
  } catch (error: any) {
    console.error('生成评论失败:', error)
    // 如果是API密钥问题，直接抛出
    if (error?.message?.includes('API密钥') || error?.message?.includes('401') || error?.message?.includes('403')) {
      throw error
    }
    // 其他错误返回备用评论
    return getFallbackComment(topic, Math.floor(Math.random() * 20))
  }
}
