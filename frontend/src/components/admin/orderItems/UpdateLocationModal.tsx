import { useState, useEffect } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"

interface Category {
  id: string
  name: string
  description: string
  imageUrl: string
  createdAt: string
  updatedAt: string
}

interface Location {
  id: string
  name: string
  orderCategories: Category[]
  createdAt: string
  updatedAt: string
}

interface UpdateLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    categoryIds: string[]
  }) => Promise<void>
  location: Location | null
  categories: Category[]
  loading: boolean
}

export default function UpdateLocationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  location, 
  categories, 
  loading 
}: UpdateLocationModalProps) {
  const [formData, setFormData] = useState({
    name: ''
  })
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  // Initialize form data when location changes
  useEffect(() => {
    if (location && isOpen) {
      setFormData({ name: location.name })
      setSelectedCategoryIds(location.orderCategories.map(category => category.id))
    }
  }, [location, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategoryIds(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  const handleSubmit = async () => {
    await onSubmit({
      name: formData.name,
      categoryIds: selectedCategoryIds
    })
  }

  const handleClose = () => {
    onClose()
  }

  if (!isOpen || !location) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Update Location</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter location name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Categories
              </label>
              
              {categories.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-md">
                  <p className="text-gray-500">No categories available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-300 rounded-md p-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedCategoryIds.includes(category.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleCategorySelection(category.id)}
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden mr-3">
                        {category.imageUrl ? (
                          <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="h-8 w-8 object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gray-300 rounded-md flex items-center justify-center">
                            <span className="text-xs text-gray-500">IMG</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {category.name}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedCategoryIds.includes(category.id)
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedCategoryIds.includes(category.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedCategoryIds.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">
                    Selected: <span className="font-medium">{selectedCategoryIds.length}</span> categorie{selectedCategoryIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
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
            disabled={loading || !formData.name}
          >
            {loading ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Updating...
              </span>
            ) : (
              "Update Location"
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 