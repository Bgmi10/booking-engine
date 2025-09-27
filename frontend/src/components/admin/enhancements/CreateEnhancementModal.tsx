import { useState, useEffect, useCallback } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import { useImageUpload } from "../../../hooks/useImageUpload"
import toast from "react-hot-toast"

interface CreateEnhancementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateEnhancementModal({ isOpen, onClose, onSuccess }: CreateEnhancementModalProps) {
  // Form states
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [pricingType, setPricingType] = useState<"PER_GUEST" | "PER_BOOKING" | "PER_DAY">("PER_BOOKING")
  const [type, setType] = useState<"PRODUCT" | "EVENT">("PRODUCT")
  const [isActive, setIsActive] = useState(true)
  const [tax, setTax] = useState(0);
  const [showCustomTax, setShowCustomTax] = useState(false);
  const [loading, setLoading] = useState(false)

  const {
    images,
    uploadingImage,
    isDragging,
    uploadImages,
    handleDragEnter,
    removeImage,
    handleDragLeave,
    handleDragOver  } = useImageUpload()

  useEffect(() => {
    if (isOpen) {
      setName("")
      setDescription("")
      setPrice("")
      setPricingType("PER_BOOKING")
      setType("PRODUCT")
      setIsActive(true)
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!name.trim()) {
      toast.error("Enhancement name is required")
      return
    }

    if (!description.trim()) {
      toast.error("Description is required")
      return
    }

    if (!price || Number(price) <= 0) {
      toast.error("Price must be greater than 0")
      return
    }

    setLoading(true)

    try {
      const requestBody = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        pricingType,
        type,
        isActive,
        tax,
        image: images?.[0] || null,
      }

      const res = await fetch(`${baseUrl}/admin/enhancements`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to create enhancement")
      }
      toast.success("Enhancement Created Successfully")
      onSuccess()
      onClose()

    } catch (error: any) {
      toast.error("Error while creation")
    } finally {
      setLoading(false)
    }
  };

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
  }, [images.length, uploadImages]);

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Create New Enhancement</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Enhancement Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 p-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Champagne on Arrival"
                    required
                  />
                </div>

                 <div className="md:col-span-2">
                 <div className="mb-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Describe the enhancement..."
                    required
                  />
                </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image (Optional)
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
              {images?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Image:</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {images.map((url: string, index: number) => (
                      <div key={index} className="relative group">
                        <div className="max-w-fit overflow-hidden rounded-md bg-gray-200">
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Item image ${index + 1}`}
                            className="object-cover h-40 w-40"
                          />
                           <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={loading}
                        >
                          <RiCloseLine size={16} />
                        </button>
                        </div>
                       
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price (€) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Tax (%)
                  </label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                      value={showCustomTax ? 'custom' : tax} 
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setShowCustomTax(true);
                        } else {
                          setShowCustomTax(false);
                          setTax(parseInt(e.target.value) || 0)
                        }
                      }}
                    >
                      <option value="0">No Tax (0%)</option>
                      <option value="3">3%</option>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                      <option value="22">22%</option>
                      <option value="custom">Custom %</option>
                    </select>
                    {showCustomTax && (
                      <input 
                        type="number" 
                        placeholder="%" 
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                        value={tax} 
                        onChange={(e) => setTax(parseInt(e.target.value))}
                        min="0"
                        max="100"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="pricingType" className="block text-sm font-medium text-gray-700">
                    Pricing Type *
                  </label>
                  <select
                    id="pricingType"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as any)}
                    className="p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="PER_BOOKING">Per Booking</option>
                    <option value="PER_GUEST">Per Guest</option>
                    <option value="PER_DAY">Per Day</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Enhancement Type *
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "PRODUCT" | "EVENT")}
                    className="p-2 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="PRODUCT">Product (Champagne, Flowers, etc.)</option>
                    <option value="EVENT">Event (Pizza Party, Wine Tasting, etc.)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active (Enhancement will be available for selection)
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    After creating the enhancement, you can add availability rules to control when and where it's available.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Creating...
                </span>
              ) : (
                "Create Enhancement"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}