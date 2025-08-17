import { useState, useEffect, useCallback } from "react"
import { RiImageAddLine, RiSearchLine, RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import { useImageUpload } from "../../../hooks/useImageUpload"
import type { OrderItem } from "../../../types/types"

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (formData: any) => void
  loading: boolean
  error: string | null
}

const WEEKDAYS = [
  { id: 1, name: "Mon" },
  { id: 2, name: "Tue" },
  { id: 3, name: "Wed" },
  { id: 4, name: "Thu" },
  { id: 5, name: "Fri" },
  { id: 6, name: "Sat" },
  { id: 0, name: "Sun" },
]

export default function CreateCategoryModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  loading, 
  error 
}: CreateCategoryModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isAvailable, setIsAvailable] = useState(true)
  const [onlyForAdmin, setOnlyForAdmin] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<OrderItem[]>([])
  const [filteredProducts, setFilteredProducts] = useState<OrderItem[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [availabilityRule, setAvailabilityRule] = useState({
    name: "All Week",
    startTime: "00:00",
    endTime: "23:59",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    isActive: true,
  })
  const [hasAvailabilityRule, setHasAvailabilityRule] = useState(true)

  const {
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

  // Fetch all products to display in the selection list
  useEffect(() => {
    if (isOpen) {
      fetch(`${baseUrl}/admin/order-items/all`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setAllProducts(data.data)
          setFilteredProducts(data.data)
        })
    }
  }, [isOpen])

  // Filter products based on search term
  useEffect(() => {
    setFilteredProducts(
      allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    )
  }, [productSearch, allProducts])

  const handleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      
      if (files.length > 1) {
        alert("Please select only one image.")
        return
      }
      
      if (images.length > 0) {
        alert("Only one image is allowed. Please remove the current image first.")
        return
      }
      
      uploadImages(files)
    }
  }, [images.length, uploadImages])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    if (files.length > 1) {
      alert("Please select only one image.")
      return
    }
    if (images.length > 0) {
      alert("Only one image is allowed. Please remove the current image first.")
      return
    }
    await uploadImages(files)
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setIsAvailable(true)
    setOnlyForAdmin(false)
    setSelectedProducts([])
    setProductSearch("")
    resetImages()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (images.length === 0) {
      alert("Please upload an image for the category.")
      return
    }
    onCreate({
      name,
      description,
      imageUrl: images[0],
      isAvailable,
      onlyForAdmin,
      orderItemIds: selectedProducts,
      availabilityRule: hasAvailabilityRule ? {
        ...availabilityRule,
        daysOfWeek: availabilityRule.daysOfWeek.map(Number)
      } : null
    })
  }

  const updateRule = (field: string, value: any) => {
    setAvailabilityRule(prev => ({ ...prev, [field]: value }))
  }

  const toggleDay = (day: number) => {
    const days = availabilityRule.daysOfWeek.includes(day)
      ? availabilityRule.daysOfWeek.filter(d => d !== day)
      : [...availabilityRule.daysOfWeek, day]
    updateRule('daysOfWeek', days.sort())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Create New Category</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-800">
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-hidden">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Left Column: Category Details */}
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image
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
                    <RiImageAddLine className="mx-auto h-12 w-12 text-gray-400" />
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

              {images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Image:</h4>
                  <div className="relative group w-48 h-48">
                    <img
                      src={images[0]}
                      alt="Category"
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(0)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loading}
                    >
                      <RiCloseLine size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900">Is Available</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="onlyForAdmin"
                  checked={onlyForAdmin}
                  onChange={(e) => setOnlyForAdmin(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="onlyForAdmin" className="ml-2 block text-sm text-gray-900">Admin Only (Hide from customers)</label>
              </div>

              {/* Availability Rule Section */}
              <div className="col-span-1 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Availability Rule</h3>
                  <div className="flex items-center">
                    <label htmlFor="hasRule" className="mr-2 text-sm font-medium text-gray-700">
                      Enable Rule
                    </label>
                    <input
                      type="checkbox"
                      id="hasRule"
                      checked={hasAvailabilityRule}
                      onChange={(e) => setHasAvailabilityRule(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {hasAvailabilityRule && (
                  <div className="p-4 border rounded-md bg-gray-50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                        <input
                          type="text"
                          value={availabilityRule.name}
                          onChange={(e) => updateRule('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                          placeholder="e.g., Weekday Lunch"
                        />
                      </div>
                      <div className="flex items-center mt-4 sm:mt-0 sm:justify-self-end">
                          <input
                          type="checkbox"
                          checked={availabilityRule.isActive}
                          onChange={(e) => updateRule('isActive', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-900">Active</label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={availabilityRule.startTime}
                          onChange={(e) => updateRule('startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={availabilityRule.endTime}
                          onChange={(e) => updateRule('endTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map(day => (
                           <button
                           type="button"
                           key={day.id}
                           onClick={() => toggleDay(day.id)}
                           className={`px-3 py-1 text-sm rounded-full border ${
                             availabilityRule.daysOfWeek.includes(day.id)
                               ? "bg-indigo-600 text-white border-indigo-600"
                               : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                           }`}
                         >
                           {day.name}
                         </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Product Selection */}
            <div className="flex flex-col border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Select Products</h3>
              <div className="relative mb-4">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex-grow overflow-y-auto border-t border-gray-200 -mx-4 px-4 pt-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2">
                      <label htmlFor={`product-${product.id}`} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleProductSelection(product.id)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{product.name}</span>
                      </label>
                      <span className="text-sm text-gray-500">€{product.price.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">No products found.</div>
                )}
              </div>
            </div>
          </div>
        
          <div className="p-6 border-t bg-gray-50 flex items-center justify-end space-x-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center"
              disabled={loading || !name}
            >
              {loading ? <BiLoader className="animate-spin mr-2" /> : null}
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 