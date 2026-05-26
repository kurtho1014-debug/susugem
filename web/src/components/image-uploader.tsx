'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, ImageIcon } from 'lucide-react'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  folder?: string        // storage sub-path, e.g. 'products'
  maxImages?: number     // default 5
  disabled?: boolean
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json()

  if (!res.ok) throw new Error(data.error ?? '上傳失敗')
  return data.url as string
}

async function deleteFile(url: string): Promise<void> {
  await fetch('/api/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}

export function ImageUploader({
  images,
  onChange,
  folder = 'uploads',
  maxImages = 5,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || disabled) return
    const remaining = maxImages - images.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      const urls = await Promise.all(toUpload.map(f => uploadFile(f, folder)))
      onChange([...images, ...urls])
    } catch (err: any) {
      alert('上傳失敗：' + (err?.message ?? err))
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async (url: string, idx: number) => {
    await deleteFile(url)
    onChange(images.filter((_, i) => i !== idx))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [images, disabled])  // eslint-disable-line react-hooks/exhaustive-deps

  const canAdd = images.length < maxImages && !disabled

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative group w-20 h-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`圖片 ${i + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(url, i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      {canAdd && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`w-full flex flex-col items-center gap-1.5 px-4 py-4 border-2 border-dashed rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer
              ${dragOver
                ? 'border-blue-400 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100'
              }`}
          >
            {uploading ? (
              <>
                <Upload className="w-5 h-5 animate-bounce" />
                <span>上傳中...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                <span>點擊或拖曳上傳圖片</span>
                <span className="text-xs text-gray-400">
                  最多 {maxImages} 張・JPG / PNG / WebP・5MB 以下
                </span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}
