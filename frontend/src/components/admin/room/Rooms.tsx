/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { 
  RiAddLine, 
  RiRefreshLine, 
  RiSearchLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiEdit2Line,
  RiImageAddLine
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import { CreateRoomModal } from "./CreateRoomModal"
import { UpdateRoomModal } from "./UpdateRoomModal"
import { ManageImagesModal } from "./ManageImagesModal"
import type { RatePolicy } from "../../../types/types"
// Room type definition
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

export default function Rooms() {
  // States
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loadingAction, setLoadingAction] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
 
  // Fetch rooms
  const fetchRooms = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/rooms/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch rooms")
      }
      
      const data = await res.json()
      setRooms(data.data)
      setFilteredRooms(data.data)
    } catch (error) {
      console.error(error)
      setError("Failed to load rooms. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchRooms()
  }, [])

  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRooms(rooms)
    } else {
      const filtered = rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredRooms(filtered)
    }
    setCurrentPage(1)
  }, [searchTerm, rooms])

  // Delete room
  const deleteRoom = async (roomId: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/rooms/${roomId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: selectedRoom?.images.map(image => image.url) }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete room")
      }
      
      setSuccess("Room deleted successfully!")
      
      // Update rooms state
      setRooms(rooms.filter(room => room.id !== roomId))
      
      // Close modal after success
      setTimeout(() => {
        setIsDeleteModalOpen(false)
        setSuccess("")
      }, 2000)
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to delete room. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredRooms.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage)
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }
  
  // Modal for room details
  const ViewRoomModal = () => {
    if (!selectedRoom) return null
    
    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Room Details</h3>
            <button 
              onClick={() => setIsViewModalOpen(false)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-start md:space-x-6">
              <div className="w-full md:w-1/3 flex justify-center mb-4 md:mb-0">
                <div className="w-32 h-32 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden">
                  {selectedRoom.images && selectedRoom.images.length > 0 ? (
                    <img 
                      src={selectedRoom.images[0].url || "/placeholder.svg"} 
                      alt={selectedRoom.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <RiImageAddLine size={48} />
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <h4 className="text-sm text-gray-500">Name</h4>
                  <p className="text-lg font-medium">{selectedRoom.name}</p>
                </div>
                
                <div>
                  <h4 className="text-sm text-gray-500">Price</h4>
                  <p className="text-lg">{formatPrice(selectedRoom.price)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm text-gray-500">Capacity</h4>
                  <p className="text-lg">{selectedRoom.capacity} {selectedRoom.capacity === 1 ? 'person' : 'people'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm text-gray-500">Created</h4>
                  <p>{formatDate(selectedRoom.createdAt)}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t pt-4">
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-gray-700">{selectedRoom.description}</p>
            </div>
            
            {selectedRoom.images && selectedRoom.images.length > 0 && (
              <div className="mt-8 border-t pt-4">
                <h4 className="font-medium mb-2">Images</h4>
                <div className="grid grid-cols-3 gap-2">
                  {selectedRoom.images.map((image) => (
                    <div key={image.id} className="relative h-24 rounded-md overflow-hidden">
                      <img 
                        src={image.url || "/placeholder.svg"} 
                        alt={selectedRoom.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            <h4 className="font-medium mb-2">Policies</h4>
            <div className="space-y-3">
  {selectedRoom.RoomRate.map((roomRate) => (
    <div 
      key={roomRate.ratePolicy.id}
      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Policy Name and Status */}
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">
            {roomRate.ratePolicy.name}
          </h4>
          <span className={`px-2 py-1 text-xs rounded-full ${
            roomRate.ratePolicy.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {roomRate.ratePolicy.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Rate/Discount Info */}
        <div className="flex flex-wrap gap-2">
          {roomRate.ratePolicy.nightlyRate && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {roomRate.ratePolicy.nightlyRate}€/night
            </span>
          )}
          {roomRate.ratePolicy.discountPercentage && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
              {roomRate.ratePolicy.discountPercentage}% discount
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {roomRate.ratePolicy.description && (
        <p className="mt-2 text-sm text-gray-600">
          {roomRate.ratePolicy.description}
        </p>
      )}

      {/* Additional Details */}
      <div className="mt-3 flex flex-wrap gap-2">
        {roomRate.ratePolicy.refundable !== undefined && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {roomRate.ratePolicy.refundable ? 'Refundable' : 'Non-refundable'}
          </span>
        )}
        {roomRate.ratePolicy.rebookValidityDays && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            Rebookable for {roomRate.ratePolicy.rebookValidityDays} days
          </span>
        )}
        {roomRate.ratePolicy.fullPaymentDays && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            Full payment in {roomRate.ratePolicy.fullPaymentDays} days
          </span>
        )}
      </div>
    </div>
  ))}
</div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg">
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
  
  // Modal for confirming room deletion
  const DeleteRoomModal = () => {
    if (!selectedRoom) return null
    
    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Delete Room</h3>
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              disabled={loadingAction}
            >
              <RiCloseLine size={24} />
            </button>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <RiCheckLine className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex items-center justify-center mb-4 text-red-500">
                <RiErrorWarningLine size={48} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Are you sure you want to delete this room?
              </h3>
              <p className="text-sm text-gray-500 text-center">
                This action cannot be undone. All data associated with "{selectedRoom.name}" will be permanently removed.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={loadingAction}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
              onClick={() => deleteRoom(selectedRoom.id)}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Deleting...
                </span>
              ) : (
                "Delete Room"
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage all rooms, prices, and images
        </p>
      </div>
      
      {/* Alerts */}
      {error && !isDeleteModalOpen && !isUpdateModalOpen && !isImagesModalOpen && !isCreateModalOpen && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <RiErrorWarningLine className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && !isDeleteModalOpen && !isUpdateModalOpen && !isImagesModalOpen && !isCreateModalOpen && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <RiCheckLine className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Actions bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <RiSearchLine className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search rooms..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={fetchRooms}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <RiRefreshLine className="mr-2 h-5 w-5" />
              Refresh
            </button>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              <RiAddLine className="mr-2 h-5 w-5" />
              Add Room
            </button>
          </div>
        </div>
      </div>
      
      {/* Rooms Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <BiLoader className="animate-spin text-indigo-600 mr-2 h-8 w-8" />
              <span className="text-gray-500 text-lg">Loading rooms...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No rooms have been added to the system yet.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Room
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Capacity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Images
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Policies
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden">
                          {room.images && room.images.length > 0 ? (
                            <img
                              src={room.images[0].url || "/placeholder.svg"}
                              alt={room.name}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <RiImageAddLine size={20} />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {room.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {room.description.length > 50 
                              ? `${room.description.substring(0, 50)}...` 
                              : room.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatPrice(room.price)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{room.images ? room.images.length : 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(room.createdAt)}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                        {room.RoomRate.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRoom(room)
                            setIsViewModalOpen(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View Details"
                        >
                          <RiEyeLine size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRoom(room)
                            setIsUpdateModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit Room"
                        >
                          <RiEdit2Line size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRoom(room)
                            setIsImagesModalOpen(true)
                          }}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Manage Images"
                        >
                          <RiImageAddLine size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRoom(room)
                            setIsDeleteModalOpen(true)
                          }}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Room"
                        >
                          <RiDeleteBin6Line size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {!loading && filteredRooms.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredRooms.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredRooms.length}</span> rooms
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1 
                        ? "text-gray-300 cursor-not-allowed" 
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === number
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {number}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isViewModalOpen && <ViewRoomModal />}
      {isDeleteModalOpen && <DeleteRoomModal />}
      {isUpdateModalOpen && (
        <UpdateRoomModal
          room={selectedRoom}
          setIsUpdateModalOpen={setIsUpdateModalOpen}
          setRooms={setRooms}
          rooms={rooms}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
      {isImagesModalOpen && (
        <ManageImagesModal
          room={selectedRoom}
          setIsImagesModalOpen={setIsImagesModalOpen}
          setRooms={setRooms}
          rooms={rooms}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
      {isCreateModalOpen && (
        <CreateRoomModal
          setIsCreateModalOpen={setIsCreateModalOpen}
          setRooms={setRooms}
          rooms={rooms}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  )
}
