import { RiCloseLine } from "react-icons/ri"
import { format } from "date-fns"

interface Enhancement {
  id: string
  title: string
  description: string
  price: number
  image?: string
  pricingType: "PER_GUEST" | "PER_BOOKING" | "PER_DAY"
  availableDays: string[]
  seasonal: boolean
  seasonStart?: string
  seasonEnd?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ViewEnhancementModalProps {
  enhancement: Enhancement | null
  setIsViewModalOpen: (isOpen: boolean) => void
}

export default function ViewEnhancementModal({
  enhancement,
  setIsViewModalOpen,
}: ViewEnhancementModalProps) {
  if (!enhancement) return null;

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "PPP");
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Get pricing type display name
  const getPricingTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      PER_GUEST: "Per Guest",
      PER_BOOKING: "Per Booking",
      PER_DAY: "Per Day"
    }
    return types[type] || type
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">Enhancement Details</h3>
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {enhancement.image && (
              <div className="mb-4">
                <img 
                  src={enhancement.image} 
                  alt={enhancement.title} 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            
            <div>
              <h4 className="text-lg font-semibold flex items-center">
                {enhancement.title}
                <span
                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enhancement.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {enhancement.isActive ? "Active" : "Inactive"}
                </span>
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                {enhancement.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-gray-500">Price</h5>
                <p className="text-base font-semibold">
                  ${enhancement.price.toFixed(2)} {' '}
                  <span className="text-sm font-normal text-gray-500">({getPricingTypeLabel(enhancement.pricingType)})</span>
                </p>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-500">Date Created</h5>
                <p className="text-sm">{formatDate(enhancement.createdAt)}</p>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-2">Available Days</h5>
              <div className="flex flex-wrap gap-2">
                {enhancement.availableDays.map(day => (
                  <span
                    key={day}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>

            {enhancement.seasonal && (
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-1">Seasonal Availability</h5>
                <p className="text-sm">
                  {enhancement.seasonStart && enhancement.seasonEnd ? (
                    <>From {formatDate(enhancement.seasonStart)} to {formatDate(enhancement.seasonEnd)}</>
                  ) : (
                    "Seasonal, but dates not specified"
                  )}
                </p>
              </div>
            )}

            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h5>
              <p className="text-sm">{formatDate(enhancement.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg sticky bottom-0">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsViewModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 