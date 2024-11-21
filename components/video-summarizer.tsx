'use client'

import { useState, useCallback } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Download } from 'lucide-react'
import MarkmapComponent from './markmap-component';
import { AskBox } from "./ask-box"

interface TaskStatus {
  status: string;
  url: string;
  result?: string;
  mindmap?: string;
  error?: string;
}

export function VideoSummarizerComponent() {
  const [videoUrls, setVideoUrls] = useState([''])
  const [isProcessing, setIsProcessing] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [tasks, setTasks] = useState<Record<string, TaskStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const [customStyle, setCustomStyle] = useState<string>('');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const handleAddLink = () => {
    setVideoUrls([...videoUrls, ''])
  }

  const handleDeleteLink = (index: number) => {
    const newUrls = videoUrls.filter((_, i) => i !== index)
    setVideoUrls(newUrls.length ? newUrls : [''])
  }

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...videoUrls]
    newUrls[index] = value
    setVideoUrls(newUrls)
  }

  const handleStartProcessing = async () => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const validUrls = videoUrls.filter(url => url.trim() !== '')
      
      if (validUrls.length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            urls: validUrls,
            customStyle: customStyle
          }),
        })

        if (!response.ok) {
          throw new Error('处理请求失败')
        }

        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }

        data.task_ids.forEach(pollTaskStatus)
      }

      // 处理文件上传
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('customStyle', customStyle)

        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`文件 ${file.name} 上传失败`)
        }

        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }

        if (data.task_id) {
          pollTaskStatus(data.task_id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理过程中发生错误')
    } finally {
      setIsProcessing(false)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status/${taskId}`)
        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        if (data.data) {
          setTasks(prev => ({
            ...prev,
            [taskId]: data.data
          }))

          if (data.data.status !== '完成' && data.data.status !== '失败') {
            setTimeout(poll, 2000)
          }
        }
      } catch (err) {
        console.error('获取任务状态失败:', err)
      }
    }

    poll()
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 添加调试日志
    console.log('文件拖入:', e.dataTransfer.files);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('处理的文件:', droppedFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));
    
    // 检查文件类型
    const validFiles = droppedFiles.filter(file => {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isValid = isAudio || isVideo;
      
      if (!isValid) {
        console.log(`不支持的文件类型: ${file.name} (${file.type})`);
      }
      return isValid;
    });

    if (validFiles.length === 0) {
      console.log('没有有效的音视频文件');
      return;
    }

    console.log('添加有效文件:', validFiles.map(f => f.name));
    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // 添加调试日志
      console.log('选择的文件:', e.target.files);
      
      const selectedFiles = Array.from(e.target.files);
      console.log('处理的文件:', selectedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      })));
      
      // 检查文件类型
      const validFiles = selectedFiles.filter(file => {
        const isAudio = file.type.startsWith('audio/');
        const isVideo = file.type.startsWith('video/');
        const isValid = isAudio || isVideo;
        
        if (!isValid) {
          console.log(`不支持的文件类型: ${file.name} (${file.type})`);
        }
        return isValid;
      });

      if (validFiles.length === 0) {
        console.log('没有有效的音视频文件');
        return;
      }

      console.log('添加有效文件:', validFiles.map(f => f.name));
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
  }

  // 添加导出文章功能
  const exportArticle = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 添加保存功能
  const handleSave = async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      const data = await response.json();
      // 可以显示一个成功提示
      console.log('保存成功:', data.path);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-blue-500 to-purple-500">
      <div className="container mx-auto px-4 py-8">
        <Card className="backdrop-blur-sm bg-white bg-opacity-10">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-white">视频内容总结</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">自定义文章风格（可选）</h2>
              <Input
                type="text"
                placeholder="不填写则使用普通总结风格，或输入你想要的风格，例如：'像乔布斯演讲一样富有感染力'"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                className="bg-white bg-opacity-10 text-white placeholder-gray-300"
              />
            </div>
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-white">输入视频链接 (支持 YouTubeB站)</h2>
                <div className="space-y-4">
                  {videoUrls.map((url, index) => (
                    <div key={index} className="flex gap-4">
                      <Input
                        type="text"
                        placeholder="请输入视频链接"
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        className="flex-1 bg-white bg-opacity-10 text-white placeholder-gray-300"
                      />
                      <Button
                        onClick={() => handleDeleteLink(index)}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-4">
                    <Button onClick={handleAddLink} className="bg-blue-500 hover:bg-blue-600 text-white">
                      添加链接
                    </Button>
                    <Button
                      onClick={handleStartProcessing}
                      disabled={isProcessing || (videoUrls.length === 1 && videoUrls[0].trim() === '' && files.length === 0)}
                      className="bg-green-500 hover:bg-green-600 text-white flex-1"
                    >
                      {isProcessing ? '处理中...' : '开始处理'}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 my-8"></div>
              <div>
                <h2 className="text-xl font-semibold mb-4 text-white">上传音视频文件</h2>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
                    border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:bg-opacity-5"
                >
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="space-y-4">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-300">📁</div>
                      <div className="text-lg font-medium text-white">拖放文件到这里���点击上传</div>
                      <div className="text-sm text-gray-300">支持音频和视频文件</div>
                    </div>
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-lg font-semibold text-white">已上传文件：</h3>
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white bg-opacity-10 p-2 rounded">
                        <span className="text-white">{file.name}</span>
                        <Button
                          onClick={() => removeFile(index)}
                          variant="ghost"
                          size="icon"
                          className="text-white hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
      
      {/* 添加任务状态显示 */}
      {Object.entries(tasks).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-white">处理状态</h2>
          <div className="space-y-4">
            {Object.entries(tasks).map(([taskId, task]) => (
              <div key={taskId} className="bg-white bg-opacity-10 p-4 rounded-lg">
                <div 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleExpand(taskId)}
                >
                  <span className="text-white">{task.url}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();  // 防止触发折叠
                        handleSave(taskId);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white hover:bg-opacity-10"
                    >
                      保存结果
                    </Button>
                    <span className={`px-2 py-1 rounded ${
                      task.status === '完成' ? 'bg-green-500' : 
                      task.status === '失败' ? 'bg-red-500' : 'bg-yellow-500'
                    } text-white`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                {expandedTasks[taskId] && (
                  <>
                    {task.result && (
                      <div className="mt-6 p-6 bg-black bg-opacity-20 rounded-lg backdrop-blur-sm">
                        <div className="flex justify-between items-center border-b border-white border-opacity-20 pb-4 mb-4">
                          <h3 className="text-white font-semibold text-xl">总结结果</h3>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportArticle(task.result!, `summary_${taskId}.txt`);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white hover:bg-opacity-10"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            导出文章
                          </Button>
                        </div>
                        <div className="text-white mt-2 whitespace-pre-wrap leading-relaxed">
                          {task.result}
                        </div>
                      </div>
                    )}
                    {task.mindmap && (
                      <div className="mt-6 p-6 bg-black bg-opacity-20 rounded-lg backdrop-blur-sm">
                        <div className="border-b border-white border-opacity-20 pb-4 mb-4">
                          <h3 className="text-white font-semibold text-xl">思维导图</h3>
                        </div>
                        <MarkmapComponent markdown={task.mindmap} taskId={taskId} />
                      </div>
                    )}
                  </>
                )}

                {expandedTasks[taskId] && task.status === "完成" && (
                  <AskBox taskId={taskId} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-500 bg-opacity-10 text-red-100 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}