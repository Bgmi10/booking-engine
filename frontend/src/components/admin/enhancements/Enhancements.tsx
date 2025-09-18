import { useEffect, useState } from "react"
import { 
  RiAddLine, 
  RiRefreshLine, 
  RiSearchLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiEdit2Line,
  RiCalendarEventLine,
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import { CreateEnhancementModal } from "./CreateEnhancementModal"
import UpdateEnhancementModal from "./UpdateEnhancementModal"  
import ViewEnhancementModal from "./ViewEnhancementModal"
import CreateEnhancementRuleModal from "./CreateEnhancementRuleModal"
import UpdateEnhancementRuleModal from "./UpdateEnhancementRuleModal"
import Events from "./events/Events"
import type { Enhancement, EnhancementRule } from "../../../types/types"

export default function Enhancements() {
  // States
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [enhancementRules, setEnhancementRules] = useState<EnhancementRule[]>([])
  const [filteredEnhancements, setFilteredEnhancements] = useState<Enhancement[]>([])
  const [filteredRules, setFilteredRules] = useState<EnhancementRule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEnhancement, setSelectedEnhancement] = useState<Enhancement | null>(null)
  const [selectedRule, setSelectedRule] = useState<EnhancementRule | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loadingAction, setLoadingAction] = useState(false)
  const [activeTab, setActiveTab] = useState<'enhancements' | 'rules' | 'events'>('enhancements')
  
  // Modal states
  const [isCreateEnhancementModalOpen, setIsCreateEnhancementModalOpen] = useState(false)
  const [isUpdateEnhancementModalOpen, setIsUpdateEnhancementModalOpen] = useState(false)
  const [isViewEnhancementModalOpen, setIsViewEnhancementModalOpen] = useState(false)
  const [isDeleteEnhancementModalOpen, setIsDeleteEnhancementModalOpen] = useState(false)
  const [isCreateRuleModalOpen, setIsCreateRuleModalOpen] = useState(false)
  const [isUpdateRuleModalOpen, setIsUpdateRuleModalOpen] = useState(false)
  const [isDeleteRuleModalOpen, setIsDeleteRuleModalOpen] = useState(false)

  // Fetch enhancements
  const fetchEnhancements = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/enhancements/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch enhancements")
      }
      
      const data = await res.json()
      setEnhancements(data.data || [])
      setFilteredEnhancements(data.data || [])
    } catch (error) {
      console.error(error)
      setError("Failed to load enhancements. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch enhancement rules
  const fetchEnhancementRules = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/enhancement-rules/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch enhancement rules")
      }
      
      const data = await res.json()
      setEnhancementRules(data.data || [])
      setFilteredRules(data.data || [])
    } catch (error) {
      console.error(error)
      setError("Failed to load enhancement rules. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchEnhancements()
    fetchEnhancementRules()
  }, [])

  // Handle search
  useEffect(() => {
    if (activeTab === 'enhancements') {
      if (searchTerm.trim() === "") {
        setFilteredEnhancements(enhancements)
      } else {
        const filtered = enhancements.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredEnhancements(filtered)
      }
    } else {
      if (searchTerm.trim() === "") {
        setFilteredRules(enhancementRules)
      } else {
        const filtered = enhancementRules.filter(
          (rule) =>
            rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rule.enhancement?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredRules(filtered)
      }
    }
  }, [searchTerm, enhancements, enhancementRules, activeTab])

  // Delete enhancement
  const deleteEnhancement = async (id: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/enhancements/${id}`, {
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
      setEnhancements(enhancements.filter(item => item.id !== id))
      setIsDeleteEnhancementModalOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to delete enhancement. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Delete rule
  const deleteRule = async (id: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/enhancement-rules/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete rule")
      }
      
      setSuccess("Rule deleted successfully!")
      setEnhancementRules(enhancementRules.filter(rule => rule.id !== id))
      setIsDeleteRuleModalOpen(false)
      
      setTimeout(() => setSuccess(""), 3000)
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to delete rule. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Delete confirmation modal for enhancement
  const DeleteEnhancementModal = () => {
    if (!selectedEnhancement) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="p-6">
            <div className="text-center">
              <RiErrorWarningLine className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Enhancement
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete "{selectedEnhancement.name}"? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteEnhancementModalOpen(false)}
              disabled={loadingAction}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteEnhancement(selectedEnhancement.id)}
              disabled={loadingAction}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              {loadingAction ? (
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

  // Delete confirmation modal for rule
  const DeleteRuleModal = () => {
    if (!selectedRule) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="p-6">
            <div className="text-center">
              <RiErrorWarningLine className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Rule
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete "{selectedRule.name}"? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteRuleModalOpen(false)}
              disabled={loadingAction}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteRule(selectedRule.id)}
              disabled={loadingAction}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              {loadingAction ? (
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

  // Get availability type badge
  const getAvailabilityBadge = (type: string) => {
    switch (type) {
      case "ALWAYS":
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Always</span>
      case "WEEKLY":
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Weekly</span>
      case "SPECIFIC_DATES":
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Specific Dates</span>
      case "SEASONAL":
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Seasonal</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{type}</span>
    }
  }

  // Get room scope badge
  const getRoomScopeBadge = (scope: string) => {
    switch (scope) {
      case "ALL_ROOMS":
        return <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">All Rooms</span>
      case "SPECIFIC_ROOMS":
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Specific Rooms</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{scope}</span>
    }
  }

  // Get pricing type badge
  const getPricingBadge = (type: string) => {
    switch (type) {
      case "PER_GUEST":
        return <span className="px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-800 rounded-full">Per Guest</span>
      case "PER_BOOKING":
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">Per Booking</span>
      case "PER_DAY":
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">Per Day</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{type}</span>
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enhancement Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage enhancements and their availability rules
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('enhancements')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enhancements'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Enhancements
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Availability Rules
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'events'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <RiCalendarEventLine className="h-4 w-4" />
              Events
            </button>
          </nav>
        </div>
      </div>

      {/* Alerts */}
      {error && !isDeleteEnhancementModalOpen && !isDeleteRuleModalOpen && (
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

      {success && !isDeleteEnhancementModalOpen && !isDeleteRuleModalOpen && (
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
      { (activeTab === "enhancements" || activeTab === "rules" ) && <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <RiSearchLine className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                if (activeTab === 'enhancements') fetchEnhancements();
                else fetchEnhancementRules();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
            >
              <RiRefreshLine className="mr-2 h-5 w-5" />
              Refresh
            </button>

            <button
              onClick={() => {
                if (activeTab === 'enhancements') setIsCreateEnhancementModalOpen(true);
                else setIsCreateRuleModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none cursor-pointer"
            >
              <RiAddLine className="mr-2 h-5 w-5" />
              {activeTab === 'enhancements' ? 'Add Enhancement' : 'Add Rule'}
            </button>
          </div>
        </div>
      </div>}

      {/* Enhancements Tab */}
      {activeTab === 'enhancements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <BiLoader className="animate-spin text-indigo-600 mr-2 h-8 w-8" />
                <span className="text-gray-500 text-lg">Loading enhancements...</span>
              </div>
            ) : filteredEnhancements.length === 0 ? (
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No enhancements found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new enhancement.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsCreateEnhancementModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <RiAddLine className="mr-2 -ml-1 h-5 w-5" />
                    Create Enhancement
                  </button>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pricing Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rules
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEnhancements.map((enhancement) => (
                    <tr key={enhancement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{enhancement.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">{enhancement.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">€{enhancement.price.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPricingBadge(enhancement.pricingType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {enhancement.enhancementRules?.length || 0} rules
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          enhancement.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {enhancement.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedEnhancement(enhancement)
                              setIsViewEnhancementModalOpen(true)
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View"
                          >
                            <RiEyeLine className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEnhancement(enhancement)
                              setIsUpdateEnhancementModalOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <RiEdit2Line className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEnhancement(enhancement)
                              setIsDeleteEnhancementModalOpen(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <RiDeleteBin6Line className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <BiLoader className="animate-spin text-indigo-600 mr-2 h-8 w-8" />
                <span className="text-gray-500 text-lg">Loading rules...</span>
              </div>
            ) : filteredRules.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rules found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create rules to control when enhancements are available.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsCreateRuleModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <RiAddLine className="mr-2 -ml-1 h-5 w-5" />
                    Create Rule
                  </button>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enhancement
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Availability
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room Scope
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{rule.enhancement?.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getAvailabilityBadge(rule.availabilityType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoomScopeBadge(rule.roomScope)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {rule.validFrom || rule.validUntil ? (
                            <>
                              {rule.validFrom ? new Date(rule.validFrom).toLocaleDateString() : 'Start'} - 
                              {rule.validUntil ? new Date(rule.validUntil).toLocaleDateString() : 'End'}
                            </>
                          ) : (
                            'Always'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rule.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRule(rule)
                              setIsUpdateRuleModalOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <RiEdit2Line className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRule(rule)
                              setIsDeleteRuleModalOpen(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <RiDeleteBin6Line className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Events Tab */}
      {activeTab === 'events' && <Events />}

      {isCreateEnhancementModalOpen && (
        <CreateEnhancementModal
          isOpen={isCreateEnhancementModalOpen}
          onClose={() => setIsCreateEnhancementModalOpen(false)}
          onSuccess={() => {
            setIsCreateEnhancementModalOpen(false)
            fetchEnhancements()
          }}
        />
      )}

      {isUpdateEnhancementModalOpen && selectedEnhancement && (
        <UpdateEnhancementModal
          isOpen={isUpdateEnhancementModalOpen}
          onClose={() => setIsUpdateEnhancementModalOpen(false)}
          onSuccess={() => {
            setIsUpdateEnhancementModalOpen(false)
            fetchEnhancements()
          }}
          enhancement={selectedEnhancement}
        />
      )}

      {isViewEnhancementModalOpen && selectedEnhancement && (
        <ViewEnhancementModal
          isOpen={isViewEnhancementModalOpen}
          onClose={() => setIsViewEnhancementModalOpen(false)}
          enhancement={selectedEnhancement}
        />
      )}

      {isCreateRuleModalOpen && (
        <CreateEnhancementRuleModal
          isOpen={isCreateRuleModalOpen}
          onClose={() => setIsCreateRuleModalOpen(false)}
          onSuccess={() => {
            setIsCreateRuleModalOpen(false)
            fetchEnhancementRules()
          }}
          enhancementId={null}
        />
      )}

      {isUpdateRuleModalOpen && selectedRule && (
        <UpdateEnhancementRuleModal
          isOpen={isUpdateRuleModalOpen}
          onClose={() => setIsUpdateRuleModalOpen(false)}
          onSuccess={() => {
            setIsUpdateRuleModalOpen(false)
            fetchEnhancementRules()
          }}
          rule={selectedRule}
        />
      )}

      {isDeleteEnhancementModalOpen && <DeleteEnhancementModal />}
      {isDeleteRuleModalOpen && <DeleteRuleModal />}
    </div>
  )
}