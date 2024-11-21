'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuestionMarkCircledIcon, Cross2Icon, PaperPlaneIcon } from "@radix-ui/react-icons"

interface Message {
  type: 'question' | 'answer' | 'error'
  content: string
}

interface AskBoxProps {
  taskId: string
}

export function AskBox({ taskId }: AskBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Message[]>([])
  const historyRef = useRef<HTMLDivElement>(null)
  
  // 获取API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  // 自动滚动到最新消息
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [history])

  // 发送问题
  const askQuestion = async () => {
    if (loading || !question.trim()) return

    const q = question.trim()
    setHistory(prev => [...prev, { type: 'question', content: q }])
    setQuestion('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/ask`, {  // 使用完整的API URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          question: q
        })
      })

      if (!res.ok) {
        throw new Error(await res.text() || '请求失败')
      }

      const data = await res.json()
      if (!data || !data.answer) {
        throw new Error('返回数据格式错误')
      }

      setHistory(prev => [...prev, { type: 'answer', content: data.answer }])
    } catch (err) {
      console.error('API调用错误:', err)
      setHistory(prev => [...prev, {
        type: 'error',
        content: err instanceof Error ? err.message : '发生错误'
      }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="default"
        size="icon"
        className="fixed right-4 bottom-4 rounded-full w-12 h-12"
        onClick={() => setIsOpen(true)}
      >
        <QuestionMarkCircledIcon className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className="fixed right-4 bottom-4 w-80 h-96 bg-background border rounded-lg shadow-lg flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium">有问题问我</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
        >
          <Cross2Icon className="h-4 w-4" />
        </Button>
      </div>

      {/* 对话历史 */}
      <div 
        ref={historyRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {history.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[80%] ${
              msg.type === 'question' ? 'ml-auto' : 'mr-auto'
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg ${
                msg.type === 'question'
                  ? 'bg-primary text-primary-foreground'
                  : msg.type === 'answer'
                  ? 'bg-muted'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* 输入框 */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
          placeholder="输入你的问题..."
          disabled={loading}
          className="flex-1"
        />
        <Button
          size="icon"
          disabled={loading || !question.trim()}
          onClick={askQuestion}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <PaperPlaneIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
} 