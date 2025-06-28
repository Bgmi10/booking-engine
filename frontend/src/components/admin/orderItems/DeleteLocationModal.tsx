import { RiCloseLine, RiErrorWarningLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"

interface Category {
  id: string
  name: string
  description: string
  imageUrl: string
  isAvailable: boolean
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

interface DeleteLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  location: Location | null
  loading: boolean
}

export default function DeleteLocationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  location, 
  loading 
}: DeleteLocationModalProps) {
  if (!isOpen || !location) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Delete Location</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <RiErrorWarningLine className="h-6 w-6 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Are you sure you want to delete this location?
              </h3>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Deleting...
              </span>
            ) : (
              "Delete Location"
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 