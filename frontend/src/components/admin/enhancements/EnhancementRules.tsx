/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { 
  RiAddLine, 
  RiDeleteBin6Line, 
  RiEdit2Line, 
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiCalendarLine,
  RiTimeLine,
  RiHomeLine
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import type { Enhancement, EnhancementRule } from "../../../types/types"
import CreateEnhancementRuleModal from "./CreateEnhancementRuleModal"
import UpdateEnhancementRuleModal from "./UpdateEnhancementRuleModal"

interface EnhancementRulesProps {
  enhancement: Enhancement
  onClose: () => void
}

export default function EnhancementRules({ enhancement, onClose }: EnhancementRulesProps) {
  const [rules, setRules] = useState<EnhancementRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<EnhancementRule | null>(null)
  const [loadingAction, setLoadingAction] = useState(false)

  // Fetch rules for this enhancement
  const fetchRules = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/enhancement-rules/by-enhancement/${enhancement.id}`, {
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch rules")
      }

      setRules(data.data || [])
    } catch (error) {
      console.error(error)
      setError("Failed to load enhancement rules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [enhancement.id])

  // Delete rule
  const deleteRule = async (ruleId: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`${baseUrl}/admin/enhancement-rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete rule")
      }

      setSuccess("Rule deleted successfully!")
      setRules(rules.filter(rule => rule.id !== ruleId))
      
      setTimeout(() => {
        setIsDeleteModalOpen(false)
        setSuccess("")
      }, 2000)
    } catch (error: any) {
      setError(error.message || "Failed to delete rule")
    } finally {
      setLoadingAction(false)
    }
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

  // Delete confirmation modal
  const DeleteRuleModal = () => {
    if (!selectedRule) return null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Delete Rule</h3>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
              disabled={loadingAction}
            >
              <RiCloseLine size={24} />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
                <div className="flex">
                  <RiCheckLine className="h-5 w-5 text-green-400" />
                  <p className="ml-3 text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            <div className="text-center">
              <RiErrorWarningLine className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete this rule?
              </h3>
              <p className="text-sm text-gray-500">
                This will remove the rule "{selectedRule.name}" permanently.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Availability Rules for {enhancement.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage when and where this enhancement is available
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error/Success Messages */}
          {error && !isDeleteModalOpen && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && !isDeleteModalOpen && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <RiCheckLine className="h-5 w-5 text-green-400" />
                <p className="ml-3 text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Add Rule Button */}
          <div className="mb-6">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <RiAddLine className="mr-2 -ml-1 h-5 w-5" />
              Add Rule
            </button>
          </div>

          {/* Rules List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <BiLoader className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <RiCalendarLine className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rules yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new availability rule for this enhancement.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <RiAddLine className="mr-2 -ml-1 h-5 w-5" />
                  Add First Rule
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-medium text-gray-900">{rule.name}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setSelectedRule(rule)
                          setIsUpdateModalOpen(true)
                        }}
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        <RiEdit2Line size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRule(rule)
                          setIsDeleteModalOpen(true)
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <RiDeleteBin6Line size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RiCalendarLine className="h-4 w-4 text-gray-400" />
                      {getAvailabilityBadge(rule.availabilityType)}
                    </div>

                    <div className="flex items-center space-x-2">
                      <RiHomeLine className="h-4 w-4 text-gray-400" />
                      {getRoomScopeBadge(rule.roomScope)}
                    </div>

                    {rule.availableDays && rule.availableDays.length > 0 && (
                      <div className="text-xs text-gray-600">
                        Days: {rule.availableDays.join(", ")}
                      </div>
                    )}

                    {(rule.availableTimeStart || rule.availableTimeEnd) && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <RiTimeLine className="h-3 w-3" />
                        <span>
                          {rule.availableTimeStart || "00:00"} - {rule.availableTimeEnd || "23:59"}
                        </span>
                      </div>
                    )}

                    {rule.validFrom || rule.validUntil ? (
                      <div className="text-xs text-gray-600">
                        Valid: {rule.validFrom ? new Date(rule.validFrom).toLocaleDateString() : "Always"} - 
                        {rule.validUntil ? new Date(rule.validUntil).toLocaleDateString() : "Always"}
                      </div>
                    ) : null}

                    <div className="pt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateEnhancementRuleModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            fetchRules()
          }}
          enhancementId={enhancement.id}
        />
      )}

      {isUpdateModalOpen && selectedRule && (
        <UpdateEnhancementRuleModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          onSuccess={() => {
            setIsUpdateModalOpen(false)
            fetchRules()
          }}
          rule={selectedRule}
        />
      )}

      {isDeleteModalOpen && <DeleteRuleModal />}
    </div>
  )
}