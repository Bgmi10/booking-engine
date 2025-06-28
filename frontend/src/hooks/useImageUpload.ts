import { useState, useCallback } from "react"
import { baseUrl } from "../utils/constants"

interface UseImageUploadReturn {
  images: string[]
  uploadingImage: boolean
  isDragging: boolean
  uploadImages: (files: File[]) => Promise<void>
  removeImage: (index: number) => Promise<void>
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>) => void
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void
  resetImages: () => void
  setInitialImages: (urls: string[]) => void
}

export const useImageUpload = (): UseImageUploadReturn => {
  const [images, setImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const uploadImages = useCallback(async (files: File[]) => {
    setUploadingImage(true)
    
    try {
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          // Step 1: Request pre-signed upload URL from backend
          const res = await fetch(`${baseUrl}/admin/upload-url`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              url: file.name,
              fileType: file.type,
            }),
          })

          const data = await res.json()

          if (!res.ok) {
            throw new Error(data.message || "Failed to get upload URL")
          }

          const uploadUrl = data.data.uploadUrl
          const finalUrl = data.data.fileUrl

          // Step 2: Upload file to S3 using the signed URL
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          })

          if (!uploadRes.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          // Step 3: Create preview URL
          const objectUrl = URL.createObjectURL(file)

          return {
            previewUrl: objectUrl,
            s3Url: finalUrl,
          }
        })
      )

      const uploadedS3Urls = uploadResults.map(r => r.s3Url)

      setImages(prev => [...prev, ...uploadedS3Urls])

    } catch (error) {
      console.error(error)
      throw new Error("Failed to upload one or more images. Please try again.")
    } finally {
      setUploadingImage(false)
      setIsDragging(false)
    }
  }, [])

  const removeImage = useCallback(async (index: number) => {
    try {
      const res = await fetch(`${baseUrl}/admin/delete-image`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ url: images[index] }),
      })
      
      if (!res.ok) {
        throw new Error("Failed to delete image")
      }
      
      if (res.status === 200) {
        const newImages = [...images]
        newImages.splice(index, 1)
        setImages(newImages)
      }
    } catch (error) {
      console.error(error)
      throw new Error("Failed to delete image")
    }
  }, [images])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      uploadImages(files)
    }
  }, [uploadImages])

  const resetImages = useCallback(() => {
    setImages([])
  }, [])

  const setInitialImages = useCallback((urls: string[]) => {
    setImages(urls)
  }, [])

  return {
    images,
    uploadingImage,
    isDragging,
    uploadImages,
    removeImage,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    resetImages,
    setInitialImages
  }
} 