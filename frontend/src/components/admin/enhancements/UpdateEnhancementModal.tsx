/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react"
import { RiCloseLine, RiErrorWarningLine, RiCheckLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
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

interface UpdateEnhancementModalProps {
  enhancement: Enhancement | any
  setIsUpdateModalOpen: (isOpen: boolean) => void
  setEnhancements: React.Dispatch<React.SetStateAction<Enhancement[]>>
  setError: (error: string) => void
  setSuccess: (success: string) => void
}

export default function UpdateEnhancementModal({
  setIsUpdateModalOpen,
  setEnhancements,
  setError,
  setSuccess,
  enhancement,
}: UpdateEnhancementModalProps) {

  const [title, setTitle] = useState(enhancement.title)
  const [description, setDescription] = useState(enhancement.description)
  const [price, setPrice] = useState(enhancement.price.toString())
  const [pricingType, setPricingType] = useState<"PER_GUEST" | "PER_BOOKING" | "PER_DAY">(enhancement.pricingType)
  const [availableDays, setAvailableDays] = useState<string[]>(enhancement.availableDays || [])
  const [seasonal, setSeasonal] = useState(enhancement.seasonal)
  const [seasonStart, setSeasonStart] = useState(enhancement.seasonStart || "")
  const [seasonEnd, setSeasonEnd] = useState(enhancement.seasonEnd || "")
  const [image, setImage] = useState(enhancement.image || "")
  const [isActive, setIsActive] = useState(enhancement.isActive)
  const [loadingAction, setLoadingAction] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  console.log(image)
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Handle available days change
  const handleAvailableDaysChange = (day: string) => {
    setAvailableDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  // Update enhancement
  const updateEnhancement = async () => {
    // Validation
    if (!title.trim()) {
      setLocalError("Enhancement title is required")
      return
    }

    if (!description.trim()) {
      setLocalError("Description is required")
      return
    }

    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setLocalError("Please enter a valid price")
      return
    }

    if (availableDays.length === 0) {
      setLocalError("Please select at least one available day")
      return
    }

    if (seasonal && (!seasonStart || !seasonEnd)) {
      setLocalError("Please provide both season start and end dates")
      return
    }

    if (seasonal && new Date(seasonStart) >= new Date(seasonEnd)) {
      setLocalError("Season end date must be after start date")
      return
    }

    setLoadingAction(true)
    setLocalError("")
    setLocalSuccess("")

    try {
      const res = await fetch(`${baseUrl}/admin/enhancements/${enhancement.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          pricingType,
          availableDays,
          seasonal,
          seasonStart: seasonal ? seasonStart : "",
          seasonEnd: seasonal ? seasonEnd : "",
          image: image || "",
          isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to update enhancement")
      }

      setLocalSuccess("Enhancement updated successfully!")
      setSuccess("Enhancement updated successfully!")

      // Update enhancements state with the updated enhancement
      setEnhancements(prev =>
        prev.map(item => (item.id === enhancement.id ? data.data : item))
      )

      // Close modal after success
      setTimeout(() => {
        setIsUpdateModalOpen(false)
      }, 2000)
    } catch (error: any) {
      console.error(error)
      setLocalError(error.message || "Failed to update enhancement. Please try again.")
      setError(error.message || "Failed to update enhancement. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">Update Enhancement</h3>
          <button
            onClick={() => setIsUpdateModalOpen(false)}
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

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Spa Package"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Detailed description of the enhancement"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="99.99"
                />
              </div>

              <div>
                <label htmlFor="pricingType" className="block text-sm font-medium text-gray-700">
                  Pricing Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="pricingType"
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as "PER_GUEST" | "PER_BOOKING" | "PER_DAY")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="PER_GUEST">Per Guest</option>
                  <option value="PER_BOOKING">Per Booking</option>
                  <option value="PER_DAY">Per Day</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                Update Image
              </label>
              <input type="file" id="image" onChange={async (e) => {
                setImage(e.target.files?.[0] || null)
        
               if (image) {
                const deleteRes = await fetch(`${baseUrl}/admin/delete-image`, {
                  method: "DELETE",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: image,
                  }),
                })

                if (!deleteRes.ok) {
                  throw new Error("Failed to delete old image")
                }
               }
                const file = e.target.files?.[0]

                const res = await fetch(`${baseUrl}/admin/upload-url`, {
                  method: "POST",
                  body: JSON.stringify({
                    url: file?.name,
                    fileType: file?.type,
                  }),
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                  },
                })

                const data = await res.json()

                if (!res.ok) {
                  throw new Error(data.message || "Failed to get upload URL")
                }

                const uploadUrl = data.data.uploadUrl
                const finalUrl = data.data.fileUrl

                await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: {
                        "Content-Type": file?.type || "",
                    },
                })
                setImage(finalUrl)
              }} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              {
                image && (
                  <div className="mt-2">
                    <img src={image} alt="Enhancement" className="w-full h-40 object-cover rounded-md" />
                  </div>
                )
              }
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Days <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-7 sm:grid-cols-7 gap-2">
                {weekdays.map(day => (
                  <div key={day} className="flex items-center">
                    <input
                      id={`day-${day}`}
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={availableDays.includes(day)}
                      onChange={() => handleAvailableDaysChange(day)}
                    />
                    <label htmlFor={`day-${day}`} className="ml-2 block text-sm text-gray-900 truncate">
                      {day.slice(0, 3)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="seasonal"
                type="checkbox"
                checked={seasonal}
                onChange={(e) => setSeasonal(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="seasonal" className="ml-2 block text-sm text-gray-900">
                Seasonal Availability
              </label>
            </div>

            {seasonal && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="seasonStart" className="block text-sm font-medium text-gray-700">
                    Season Start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="seasonStart"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="seasonEnd" className="block text-sm font-medium text-gray-700">
                    Season End <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="seasonEnd"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active (immediately available for booking)
              </label>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg sticky bottom-0">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsUpdateModalOpen(false)}
            disabled={loadingAction}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            onClick={updateEnhancement}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Updating...
              </span>
            ) : (
              "Update Enhancement"
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 