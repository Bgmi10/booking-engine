/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react"
import { useState } from "react"
import { RiCloseLine, RiCheckLine, RiErrorWarningLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"

// here instead of adding a image url, we will add a image file that should be uploaded to the server and server will return a url to upload to s3 and then we will use that url to display the image you can and this feature feature needs to be there om update enhancement modal as well

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

interface CreateEnhancementModalProps {
  setIsCreateModalOpen: (isOpen: boolean) => void
  setEnhancements: React.Dispatch<React.SetStateAction<Enhancement[]>>
  enhancements: Enhancement[]
  setError: (error: string) => void
  setSuccess: (success: string) => void
}

export function CreateEnhancementModal({
  setIsCreateModalOpen,
  setEnhancements,
  enhancements,
  setError,
  setSuccess,
}: CreateEnhancementModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [pricingType, setPricingType] = useState<"PER_GUEST" | "PER_BOOKING" | "PER_DAY">("PER_BOOKING")
  const [availableDays, setAvailableDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
  const [seasonal, setSeasonal] = useState(false)
  const [seasonStart, setSeasonStart] = useState("")
  const [seasonEnd, setSeasonEnd] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [uploading, setUploading] = useState(false)
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Handle available days change
  const handleAvailableDaysChange = (day: string) => {
    setAvailableDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  // Create enhancement
  const createEnhancement = async () => {
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
      const res = await fetch(`${baseUrl}/admin/enhancements`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: title,
          description,
          price: Number(price),
          pricingType,
          availableDays,
          seasonal,
          seasonStart,
          seasonEnd,
          image: image,
          isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to create enhancement")
      }

      setLocalSuccess("Enhancement created successfully!")
      setSuccess("Enhancement created successfully!")

      // Update enhancements state with the new enhancement
      setEnhancements([...enhancements, data.data])

      // Close modal after success
      setTimeout(() => {
        setIsCreateModalOpen(false)
      }, 2000)
    } catch (error: any) {
      console.error(error)
      setLocalError(error.message || "Failed to create enhancement. Please try again.")
      setError(error.message || "Failed to create enhancement. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">Create New Enhancement</h3>
          <button
            onClick={() => setIsCreateModalOpen(false)}
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
                  Price (EUR) <span className="text-red-500">*</span>
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
                Image URL
              </label>
              {uploading ? (
                <div className="flex items-center justify-center">
                  <BiLoader className="animate-spin mr-2" />
                  Uploading...
                </div>
              ) : (
                  <input
                  type="file"
                id="image"
                onChange={async (e) => {
                  setUploading(true)           
                  setImage(e.target.files?.[0] || null)
                  try {
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

                    const uploadRes = await fetch(uploadUrl, {
                      method: "PUT",
                      body: file,
                      headers: {
                        "Content-Type": file?.type || "",
                      },
                    })

                    if (!uploadRes.ok) {
                      throw new Error("Failed to upload image")
                    }

                    setImage(finalUrl)
                    
                  } catch (e) {
                    console.log(e)
                  } finally {
                    setUploading(false)
                  }
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://example.com/image.jpg"
              />)}
            </div>
            {
              image && (
                <div>
                  <img 
                  //@ts-ignore
                  src={image} alt="Enhancement" className="w-full h-40 object-cover rounded-md" />
                </div>
              )
            }
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
            onClick={() => setIsCreateModalOpen(false)}
            disabled={loadingAction}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            onClick={createEnhancement}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Creating...
              </span>
            ) : (
              "Create Enhancement"
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 