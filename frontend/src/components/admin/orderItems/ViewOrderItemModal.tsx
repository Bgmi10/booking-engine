import { RiCloseLine, RiImageAddLine } from "react-icons/ri"

interface OrderItem {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  createdAt: string
  updatedAt: string
  isAvailable: boolean
}

interface ViewOrderItemModalProps {
  isOpen: boolean
  onClose: () => void
  orderItem: OrderItem | null
}

export default function ViewOrderItemModal({ 
  isOpen, 
  onClose, 
  orderItem 
}: ViewOrderItemModalProps) {
  if (!isOpen || !orderItem) return null

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex justify-between items-center border-b p-5">
          <h3 className="text-xl font-semibold text-gray-900">
            Product Preview: <span className="font-normal">{orderItem.name}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image Column */}
            <div className="flex flex-col items-center">
              <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shadow-inner">
                {orderItem.imageUrl ? (
                  <img
                    src={orderItem.imageUrl}
                    alt={orderItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <RiImageAddLine size={64} />
                    <p>No image</p>
                  </div>
                )}
              </div>
            </div>

            {/* Details Column */}
            <div className="space-y-4">
              <div>
                <h4 className="text-2xl font-bold text-gray-800">{orderItem.name}</h4>
                <p className="text-lg text-gray-500 mt-1">{orderItem.description}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-600">Price</dt>
                    <dd className="text-lg font-semibold text-indigo-600">{formatPrice(orderItem.price)}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-sm font-medium text-gray-600">Availability</dt>
                    <dd className={`text-sm font-semibold px-2 py-1 rounded-full ${
                      orderItem.isAvailable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {orderItem.isAvailable ? 'Available' : 'Unavailable'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Date Created</dt>
                    <dd className="text-sm text-gray-800">{formatDate(orderItem.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Last Updated</dt>
                    <dd className="text-sm text-gray-800">{formatDate(orderItem.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 