/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { 
  RiCloseLine, 
  RiCheckLine, 
  RiErrorWarningLine
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import { PlusCircleIcon } from "lucide-react"
import type { RatePolicy } from "../../../types/types"
import { AttachPoliciesModal } from "../../ui/AttachPolicyModal"

interface RoomImage {
  id: string
  url: string
  roomId: string
  createdAt: string
  updatedAt: string
}

interface RoomRate {
  ratePolicy: RatePolicy
}

interface Room {
  id: string
  name: string
  price: number
  description: string
  capacity: number
  images: RoomImage[]
  createdAt: string
  RoomRate: RoomRate[]
  updatedAt: string
}

interface UpdateRoomModalProps {
  room: Room | null
  setIsUpdateModalOpen: (isOpen: boolean) => void
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>
  rooms: Room[]
  setError: (error: string) => void
  setSuccess: (success: string) => void
}

export function UpdateRoomModal({
  room,
  setIsUpdateModalOpen,
  setRooms,
  rooms,
  setError,
  setSuccess
}: UpdateRoomModalProps) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [loadingAction, setLoadingAction] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [isAttachPoliciesModalOpen, setIsAttachPoliciesModalOpen] = useState(false)
  const [ratepolicies, setRatepolicies] = useState<{
    singlePolicy: RatePolicy[];
    discountPolicy: RatePolicy[];
  }>({
    singlePolicy: [],
    discountPolicy: []
  })
  const [isDiscountTab, setIsDiscountTab] = useState(false)
  const [selectedPolicies, setSelectedPolicies] = useState<RatePolicy[]>([])

  // Initialize form with room data
  useEffect(() => {
    if (room) {
      setName(room.name)
      setPrice(room.price.toString())
      setDescription(room.description)
      setCapacity(room.capacity.toString())
      // Initialize selected policies from room's existing policies
      if (room.RoomRate) {
        setSelectedPolicies(room.RoomRate.map(rate => rate.ratePolicy))
      }
    }
  }, [room])

  const togglePolicySelection = (policy: RatePolicy) => {
    setSelectedPolicies(prev => {
      const isSelected = prev.some(p => p.id === policy.id);
      if (isSelected) {
        return prev.filter(p => p.id !== policy.id);
      } else {
        return [...prev, policy];
      }
    });
  };

  const removePolicy = (policyId: string) => {
    setSelectedPolicies(prev => prev.filter(p => p.id !== policyId));
  };

  // Update room
  const updateRoom = async () => {
    if (!room) return
    
    // Validation
    if (!name.trim()) {
      setLocalError("Room name is required")
      return
    }
    
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setLocalError("Please enter a valid price")
      return
    }
    
    if (!capacity || isNaN(Number(capacity)) || Number(capacity) <= 0) {
      setLocalError("Please enter a valid capacity")
      return
    }
    
    setLoadingAction(true)
    setLocalError("")
    setLocalSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/rooms/${room.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          description,
          capacity: Number(capacity),
          ratePolicyId: selectedPolicies.map(policy => policy.id)
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to update room")
      }
      
      setLocalSuccess("Room updated successfully!")
      setSuccess("Room updated successfully!")
      
      // Update rooms state
      setRooms(
        rooms.map((r) => (r.id === room.id ? { ...r, ...data.data } : r))
      )
      
      // Close modal after success
      setTimeout(() => {
        setIsUpdateModalOpen(false)
      }, 2000)
      
    } catch (error: any) {
      console.error(error)
      setLocalError(error.message || "Failed to update room. Please try again.")
      setError(error.message || "Failed to update room. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

 

  if (!room) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Update Room</h3>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Room Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Deluxe Suite"
                disabled={loadingAction}
              />
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price per Night (USD) *
              </label>
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="199.99"
                min="0"
                step="0.01"
                disabled={loadingAction}
              />
            </div>
            
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (People) *
              </label>
              <input
                type="number"
                id="capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="2"
                min="1"
                disabled={loadingAction}
              />
            </div>

            <div className="md:col-span-2">
              <button 
                className="border border-gray-300 text-gray-500 px-4 cursor-pointer mt-2 py-2 rounded-md flex items-center mb-3" 
                onClick={() => {
                  setIsAttachPoliciesModalOpen(true)
                  fetch(baseUrl + "/admin/rate-policies/all", {
                    method: "GET",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  })
                  .then(res => res.json())
                  .then(data => {
                    setRatepolicies({
                      singlePolicy: data.data.filter((policy: RatePolicy) => policy.discountPercentage === null),
                      discountPolicy: data.data.filter((policy: RatePolicy) => policy.discountPercentage !== null)
                    })
                  })
                }}
              > 
                <PlusCircleIcon className="w-4 h-4 mr-2" /> 
                Update Policies
              </button>

              {/* Display selected policies */}
              {selectedPolicies.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Selected Policies:</h4>
                  <div className="space-y-2">
                    {selectedPolicies.map(policy => (
                      <div key={policy.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium">{policy.name}</p>
                          {policy.discountPercentage ? (
                            <p className="text-sm text-gray-500">{policy.discountPercentage}% discount</p>
                          ) : (
                            <p className="text-sm text-gray-500">{policy.nightlyRate}€ per night</p>
                          )}
                        </div>
                        <button
                          onClick={() => removePolicy(policy.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <RiCloseLine size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="A luxurious room with a beautiful view..."
                disabled={loadingAction}
              />
            </div>
          </div>
        </div>
        
        {isAttachPoliciesModalOpen && (
          <AttachPoliciesModal
            setIsAttachPoliciesModalOpen={setIsAttachPoliciesModalOpen}
            ratepolicies={ratepolicies}
            isDiscountTab={isDiscountTab}
            setIsDiscountTab={setIsDiscountTab}
            selectedPolicies={selectedPolicies}
            togglePolicySelection={togglePolicySelection}
          />
        )}
        
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
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
            onClick={updateRoom}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Updating...
              </span>
            ) : (
              "Update Room"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
