import { RiCloseLine, RiImageAddLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"

interface OrderItem {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  createdAt: string
  updatedAt: string
}

interface DeleteOrderItemModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  orderItem: OrderItem | null
  loading: boolean
}

export default function DeleteOrderItemModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderItem, 
  loading 
}: DeleteOrderItemModalProps) {
  if (!isOpen || !orderItem) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Delete Order Item</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden">
              {orderItem.imageUrl ? (
                <img
                  src={orderItem.imageUrl}
                  alt={orderItem.name}
                  className="h-12 w-12 object-cover"
                />
              ) : (
                <RiImageAddLine size={24} />
              )}
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">{orderItem.name}</h4>
              <p className="text-sm text-gray-500">{formatPrice(orderItem.price)}</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete this order item? This action cannot be undone.
          </p>
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
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 