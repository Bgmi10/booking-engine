/* eslint-disable react-hooks/exhaustive-deps */
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
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { CreateEnhancementModal } from "./CreateEnhancementModal"
import Pagination from "../../../components/ui/Pagination"
import { formatDatetime } from "../../../utils/format"
import { baseUrl } from "../../../utils/constants"
import UpdateEnhancementModal from "./UpdateEnhancementModal"
import ViewEnhancementModal from "./ViewEnhancementModal"
import type { Enhancement } from "../../../types/types"

export default function Enhancements() {
  // States
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [filteredEnhancements, setFilteredEnhancements] = useState<Enhancement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEnhancement, setSelectedEnhancement] = useState<Enhancement | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loadingAction, setLoadingAction] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [totalPages, setTotalPages] = useState(1)

  // Fetch enhancements
  const fetchEnhancements = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/enhancements/all`, {
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch enhancements")
      }

      setEnhancements(data.data)
      setFilteredEnhancements(data.data)
      setTotalPages(Math.ceil(data.data.length / itemsPerPage))
    } catch (error) {
      console.error(error)
      setError("Failed to load enhancements. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchEnhancements()
  }, [])

  // Handle search and filter
  useEffect(() => {
    let filtered = enhancements

    // Apply category filter
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter((enhancement) => enhancement.pricingType === categoryFilter)
    }

    // Apply search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (enhancement) =>
          enhancement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          enhancement.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEnhancements(filtered)
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, enhancements])

  // Delete enhancement
  const deleteEnhancement = async (enhancementId: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`${baseUrl}/admin/enhancements/${enhancementId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete enhancement")
      }

      setSuccess("Enhancement deleted successfully!")

      // Update enhancements state
      setEnhancements(enhancements.filter((enhancement) => enhancement.id !== enhancementId))

      // Close modal after success
      setTimeout(() => {
        setIsDeleteModalOpen(false)
        setSuccess("")
      }, 2000)
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to delete enhancement. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredEnhancements.slice(indexOfFirstItem, indexOfLastItem)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  // Get category badge color
  const getPricingTypeBadgeClass = (pricingType: string) => {
    switch (pricingType) {
      case "PER_GUEST":
        return "bg-blue-100 text-blue-800"
      case "PER_BOOKING":
        return "bg-green-100 text-green-800"
      case "PER_DAY":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Modal for confirming enhancement deletion
  const DeleteEnhancementModal = () => {
    if (!selectedEnhancement) return null

    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Delete Enhancement</h3>
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
                Are you sure you want to delete this enhancement?
              </h3>
              <p className="text-sm text-gray-500 text-center">
                This action cannot be undone. All data associated with the enhancement "{selectedEnhancement.title}" will
                be permanently removed.
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
              onClick={() => deleteEnhancement(selectedEnhancement.id)}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Deleting...
                </span>
              ) : (
                "Delete Enhancement"
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enhancement Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage all enhancements for guest bookings</p>
      </div>

      {/* Alerts */}
      {error && !isDeleteModalOpen && !isUpdateModalOpen && !isViewModalOpen && !isCreateModalOpen && (
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

      {success && !isDeleteModalOpen && !isUpdateModalOpen && !isViewModalOpen && !isCreateModalOpen && (
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
          <div className="flex flex-col md:flex-row w-full md:w-auto space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <RiSearchLine className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search enhancements..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="ALL">All Pricing Types</option>
              <option value="PER_GUEST">Per Guest</option>
              <option value="PER_BOOKING">Per Booking</option>
              <option value="PER_DAY">Per Day</option>
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={fetchEnhancements}
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
              Add Enhancement
            </button>
          </div>
        </div>
      </div>

      {/* Enhancements Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <BiLoader className="animate-spin text-indigo-600 mr-2 h-8 w-8" />
              <span className="text-gray-500 text-lg">Loading enhancements...</span>
            </div>
          ) : enhancements.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No enhancements found</h3>
              <p className="mt-1 text-sm text-gray-500">No enhancements have been added to the system yet.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  <RiAddLine className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add Enhancement
                </button>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
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
                    Pricing Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
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
                {currentItems.map((enhancement) => (
                  <tr key={enhancement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{enhancement.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{enhancement.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">€{enhancement.price.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getPricingTypeBadgeClass(
                          enhancement.pricingType
                        )}`}
                      >
                        {enhancement.pricingType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          enhancement.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {enhancement.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDatetime(enhancement.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEnhancement(enhancement)
                            setIsViewModalOpen(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View Details"
                        >
                          <RiEyeLine size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEnhancement(enhancement)
                            setIsUpdateModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit Enhancement"
                        >
                          <RiEdit2Line size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEnhancement(enhancement)
                            setIsDeleteModalOpen(true)
                          }}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Enhancement"
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
        {!loading && filteredEnhancements.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(indexOfLastItem, filteredEnhancements.length)}</span> of{" "}
                  <span className="font-medium">{filteredEnhancements.length}</span> enhancements
                </p>
              </div>
              <div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={paginate}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isViewModalOpen && (
        <ViewEnhancementModal
          enhancement={selectedEnhancement}
          setIsViewModalOpen={setIsViewModalOpen}
        />
      )}
      {isDeleteModalOpen && <DeleteEnhancementModal />}
      {isUpdateModalOpen && (
        <UpdateEnhancementModal
          enhancement={selectedEnhancement}
          setIsUpdateModalOpen={setIsUpdateModalOpen}
          setEnhancements={setEnhancements}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
      {isCreateModalOpen && (
        <CreateEnhancementModal
          setIsCreateModalOpen={setIsCreateModalOpen}
          setEnhancements={setEnhancements}
          enhancements={enhancements}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </div>
  )
}

