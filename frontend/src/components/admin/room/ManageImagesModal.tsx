import type React from "react"
import { useState } from "react"
import { RiCloseLine, RiCheckLine, RiErrorWarningLine, RiImageAddLine, RiDeleteBin6Line } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"

interface RoomImage {
  id: string
  url: string
  roomId: string
  createdAt: string
  updatedAt: string
}

interface Room {
  id: string
  name: string
  price: number
  description: string
  capacity: number
  images: RoomImage[]
  createdAt: string
  updatedAt: string
}

interface ManageImagesModalProps {
  room: Room | null
  setIsImagesModalOpen: (isOpen: boolean) => void
  setRooms: (rooms: Room[]) => void
  rooms: Room[]
  setError: (error: string) => void
  setSuccess: (success: string) => void
}

export function ManageImagesModal({
  room,
  setIsImagesModalOpen,
  setRooms,
  rooms
}: ManageImagesModalProps) {
  const [loadingAction] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)

  if (!room) return null

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setUploadingImage(true)
    setLocalError("")

    try {
      const response = await Promise.all(Array.from(e.target.files).map(async (file) => {

        const response = await fetch(`${baseUrl}/admin/upload-url`, {
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

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Failed to get upload URL")
        }

        const uploadUrl = data.data.uploadUrl
        const finalUrl = data.data.fileUrl

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

        const objectUrl = URL.createObjectURL(file)

        return {
          previewUrl: objectUrl,
          s3Url: finalUrl,
        }
      }))
      
        const res = await fetch(`${baseUrl}/admin/rooms/${room.id}/images`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: response.map((image) => image.s3Url),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to add image")
      }

      setLocalSuccess("Image added successfully!")
    } catch (error) {
      console.error(error)
      setLocalError("Failed to upload image. Please try again.")
    } finally {
      setUploadingImage(false)
    }
  }

  // Delete image
  const deleteImage = async (imageId: string, url: string) => {
    setDeletingImageId(imageId)
    setLocalError("")

    try {
    await Promise.all(
        [fetch(`${baseUrl}/admin/rooms/${room.id}/images/${imageId}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }), fetch(`${baseUrl}/admin/delete-image`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url
            })
          })
        ]
      )
    
      setLocalSuccess("Image deleted successfully!")
      const updatedRoom = {
        ...room,
        images: room.images.filter((img) => img.id !== imageId),
      }

      setRooms(rooms.map((r) => (r.id === room.id ? updatedRoom : r)))
    } catch (error) {
      console.error(error)
      setLocalError("Failed to delete image. Please try again.")
    } finally {
      setDeletingImageId(null)
    }
  }

   return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Manage Room Images</h3>
          <button
            onClick={() => setIsImagesModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={loadingAction}
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">
          {localError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{localError}</p>
                </div>
              </div>
            </div>
          )}

          {localSuccess && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiCheckLine className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{localSuccess}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex gap-2 items-center">
              <h4 className="text-lg font-medium mb-2">Add New Image</h4>
              <span className="text-xs text-gray-500">(Supports multiple images upload)</span>
            </div>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                  >
                    <span>Upload an image</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      multiple
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={loadingAction || uploadingImage}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>

                {uploadingImage && (
                  <div className="flex items-center justify-center mt-2">
                    <BiLoader className="animate-spin text-indigo-600 mr-2" />
                    <span className="text-sm text-gray-500">Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2">Current Images</h4>
            {room.images.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-md">
                <RiImageAddLine className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No images yet. Add some images to showcase this room.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {room.images.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                      <img src={image.url || "/placeholder.svg"} alt={`Room image`} className="object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => deleteImage(image.id, image.url)}
                          className="p-2 bg-red-500 rounded-full text-white"
                          title="Delete Image"
                          disabled={!!deletingImageId}
                        >
                          <RiDeleteBin6Line size={18} />
                        </button>
                      </div>
                    </div>

                    {deletingImageId === image.id && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <BiLoader className="animate-spin text-white h-8 w-8" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsImagesModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
