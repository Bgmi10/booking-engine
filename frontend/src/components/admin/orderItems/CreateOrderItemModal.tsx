import { useState, useCallback } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { useImageUpload } from "../../../hooks/useImageUpload"

interface CreateOrderItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    description: string
    price: number
    imageUrl?: string
    role: string
  }) => Promise<void>
  loading: boolean
}

export default function CreateOrderItemModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading 
}: CreateOrderItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    role: 'KITCHEN' // Default to KITCHEN role
  })


  const {
    //@ts-ignore
    imageUrls,
    images,
    uploadingImage,
    isDragging,
    uploadImages,
    removeImage,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    resetImages
  } = useImageUpload()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const files = Array.from(e.target.files)
    
    // Check if user is trying to upload more than 1 image
    if (files.length > 1) {
      alert("Please select only one image. Multiple images are not allowed for order items.")
      return
    }
    
    // Check if an image is already uploaded
    if (images.length > 0) {
      alert("Only one image is allowed per order item. Please remove the current image first.")
      return
    }
    
    await uploadImages(files)
  }

  // Custom handleDrop with single image restriction
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      
      // Check if user is trying to upload more than 1 image
      if (files.length > 1) {
        alert("Please select only one image. Multiple images are not allowed for order items.")
        return
      }
      
      // Check if an image is already uploaded
      if (images.length > 0) {
        alert("Only one image is allowed per order item. Please remove the current image first.")
        return
      }
      
      uploadImages(files)
    }
  }, [images.length, uploadImages])

  const handleSubmit = async () => {
    const submitData: any = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      role: formData.role
    }
    
    // Only include imageUrl if an image was uploaded
    if (images.length > 0) {
      submitData.imageUrl = images[0]
    }
    
    await onSubmit(submitData)
    setFormData({ name: '', description: '', price: '', role: 'KITCHEN' })
    resetImages()
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', price: '', role: 'KITCHEN' })
    resetImages()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 mt-20">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Create New Order Item</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter item name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (€) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="KITCHEN">Kitchen</option>
                <option value="WAITER">Waiter</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter item description"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image (Optional)
                <span className="text-xs text-gray-500 ml-2">(Upload one image for the item)</span>
              </label>
              
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                  isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
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
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                    >
                      <span>Upload image</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={loading || uploadingImage}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB (Max 1 image)</p>
                  
                  {uploadingImage && (
                    <div className="flex items-center justify-center mt-2">
                      <BiLoader className="animate-spin text-indigo-600 mr-2" />
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </div>
                  )}
                  
                  {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-md pointer-events-none">
                      <div className="bg-white p-4 rounded-md shadow-lg border border-indigo-300">
                        <p className="text-indigo-600 font-medium">Drop image to upload</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Display uploaded image */}
          {imageUrls?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Image:</h4>
              <div className="grid grid-cols-1 gap-4">
                {imageUrls.map((url: string, index: number) => (
                  <div key={index} className="relative group">
                    <div className="aspect-w-1 aspect-h-1 w-full max-w-xs overflow-hidden rounded-md bg-gray-200">
                      <img
                        src={url || "/placeholder.svg"}
                        alt={`Item image ${index + 1}`}
                        className="object-cover w-full h-48"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loading}
                    >
                      <RiCloseLine size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading || !formData.name || !formData.description || !formData.price}
          >
            {loading ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Creating...
              </span>
            ) : (
              "Create"
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 