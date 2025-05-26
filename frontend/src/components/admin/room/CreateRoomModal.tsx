/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { 
  RiCloseLine, 
  RiCheckLine, 
  RiErrorWarningLine,
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import { PlusCircleIcon } from "lucide-react"
import type { RatePolicy } from "../../../types/types"
import { AttachPoliciesModal } from "../../ui/AttachPolicyModal"
interface Room {
  id: string
  name: string
  price: number
  description: string
  capacity: number
  images: any[]
  createdAt: string
  updatedAt: string
}

interface CreateRoomModalProps {
  setIsCreateModalOpen: (isOpen: boolean) => void
  setRooms: (rooms: Room[]) => void
  rooms: Room[]
  setError: (error: string) => void
  setSuccess: (success: string) => void
}

export function CreateRoomModal({
  setIsCreateModalOpen,
  setRooms,
  rooms,
  setError,
  setSuccess
}: CreateRoomModalProps) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loadingAction, setLoadingAction] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
  
    const files = Array.from(e.target.files);
    setUploadingImage(true);
    setLocalError("");
  
    try {
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          // Step 1: Request pre-signed upload URL from backend
          const res = await fetch(`${baseUrl}/admin/upload-url`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              url: file.name,
              fileType: file.type,
            }),
          });
  
          const data = await res.json();
  
          if (!res.ok) {
            throw new Error(data.message || "Failed to get upload URL");
          }
  
          const uploadUrl = data.data.uploadUrl;
          const finalUrl = data.data.fileUrl;
  
          // Step 2: Upload file to S3 using the signed URL
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });
  
          if (!uploadRes.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
  
          // Step 3: Create preview URL
          const objectUrl = URL.createObjectURL(file);
  
          return {
            previewUrl: objectUrl,
            s3Url: finalUrl,
          };
        })
      );
  
      // Step 4: Update state with all uploaded URLs
      const uploadedObjectUrls = uploadResults.map(r => r.previewUrl);
      const uploadedS3Urls = uploadResults.map(r => r.s3Url);
  
      setImageUrls(prev => [...prev, ...uploadedObjectUrls]);
      setImages(prev => [...prev, ...uploadedS3Urls]);
  
    } catch (error) {
      console.error(error);
      setLocalError("Failed to upload one or more images. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };
  
  const removeImage = async (index: number) => {
    const newImageUrls = [...imageUrls]
    const res = await fetch(`${baseUrl}/admin/delete-image`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
        body: JSON.stringify({ url: images[index] }),
    })
    if (!res.ok) {
      throw new Error("Failed to delete image")
    }
    if (res.status === 200) {
      newImageUrls.splice(index, 1)
      setImageUrls(newImageUrls)
      
      const newImages = [...images]
      newImages.splice(index, 1)
      setImages(newImages)
    }
  }

  const createRoom = async () => {
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
      const res = await fetch(`${baseUrl}/admin/rooms`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          description,
          capacity: Number(capacity),
          images,
          ratePolicyId: selectedPolicies.map(policy => policy.id)
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create room")
      }
      
      setLocalSuccess("Room created successfully!")
      setSuccess("Room created successfully!")
      
      // Update rooms state
      setRooms([...rooms, data.data])
      
      // Close modal after success
      setTimeout(() => {
        setIsCreateModalOpen(false)
      }, 2000)
      
    } catch (error: any) {
      console.error(error)
      setLocalError(error.message || "Failed to create room. Please try again.")
      setError(error.message || "Failed to create room. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

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

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Add New Room</h3>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                Price per Night (€) *
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

            <div className="md:col-span-2">
              <button 
                className="border border-gray-300 text-gray-500 px-4 cursor-pointer mt-2 py-2 rounded-md flex items-center" 
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
                Attach Policies
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
            </div>
            
            {
              isAttachPoliciesModalOpen && (
                <AttachPoliciesModal
                  setIsAttachPoliciesModalOpen={setIsAttachPoliciesModalOpen}
                  ratepolicies={ratepolicies}
                  isDiscountTab={isDiscountTab}
                  setIsDiscountTab={setIsDiscountTab}
                  selectedPolicies={selectedPolicies}
                  togglePolicySelection={togglePolicySelection}
                />
              )
            }
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Images 
                <span className="text-xs text-gray-500 ml-2">(Supports multiple images upload)</span>
              </label>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                    >
                      <span>Upload an image</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        multiple
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={loadingAction || uploadingImage}
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
              
              {imageUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`Room image ${index + 1}`}
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={loadingAction}
                      >
                        <RiCloseLine size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
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
            onClick={createRoom}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Creating...
              </span>
            ) : (
              "Create Room"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}