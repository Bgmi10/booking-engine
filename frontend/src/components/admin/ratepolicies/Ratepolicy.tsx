/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { RiAddLine, RiDeleteBin6Line, RiEdit2Line, RiEyeLine } from "react-icons/ri";
import { BiLoader } from "react-icons/bi";
import { baseUrl } from "../../../utils/constants";
import CreateRatePolicyModal from "./CreateRatePolicyModal";
import UpdateRatePolicyModal from "./UpdateRatePolicyModal";
import ViewRatePolicyModal from "./ViewRatePolicyModal";
import type { RatePolicy } from "../../../types/types";
export default function Ratepolicy() {
  const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RatePolicy | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [refundableFilter, setRefundableFilter] = useState<"all" | "refundable" | "non-refundable">("all");

  // Fetch rate policies
  const fetchRatePolicies = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/all`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch rate policies");
      }

      setRatePolicies(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch rate policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatePolicies();
  }, []);

  // Delete rate policy
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this rate policy?")) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete rate policy");
      }

      setSuccess("Rate policy deleted successfully");
      setRatePolicies(ratePolicies.filter((policy) => policy.id !== id));
    } catch (error: any) {
      setError(error.message || "Failed to delete rate policy");
    }
  };

  // Filter and search logic
  const filteredPolicies = ratePolicies.filter((policy) => {
    const matchesSearch = policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ? true :
      statusFilter === "active" ? policy.isActive :
      !policy.isActive;

    const matchesRefundable = refundableFilter === "all" ? true :
      refundableFilter === "refundable" ? policy.refundable :
      !policy.refundable;

    return matchesSearch && matchesStatus && matchesRefundable;
  });
    
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rate Policies</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your hotel's rate policies</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search rate policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={refundableFilter}
            onChange={(e) => setRefundableFilter(e.target.value as "all" | "refundable" | "non-refundable")}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="refundable">Refundable</option>
            <option value="non-refundable">Non-refundable</option>
          </select>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center"
        >
          <RiAddLine className="mr-2" />
          Create Rate Policy
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <BiLoader className="animate-spin text-4xl text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                      <div className="text-sm text-gray-500 line-clamp-2 w-40">{policy.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{policy?.nightlyRate ? "€" : ""}{ policy?.nightlyRate ? policy?.nightlyRate : policy?.discountPercentage} { policy?.discountPercentage ? "%" : ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        policy.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                   { <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        policy?.refundable ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        { policy.discountPercentage ? "Discount" : policy?.refundable ? "Refundable" : "Non-refundable"}
                      </span>
                    </td>}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setIsViewModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <RiEyeLine size={20} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setIsUpdateModalOpen(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          <RiEdit2Line size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(policy.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <RiDeleteBin6Line size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals will be implemented in separate components */}
      {isCreateModalOpen && (
        <CreateRatePolicyModal
          setIsCreateModalOpen={setIsCreateModalOpen}
          setRatePolicies={setRatePolicies}
          ratePolicies={ratePolicies}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}

      {isUpdateModalOpen && selectedPolicy && (
        <UpdateRatePolicyModal
          setIsUpdateModalOpen={setIsUpdateModalOpen}
          setRatePolicies={setRatePolicies}
          ratePolicies={ratePolicies}
          setError={setError}
          setSuccess={setSuccess}
          ratePolicy={selectedPolicy}
        />
      )}

      {isViewModalOpen && selectedPolicy && (
        <ViewRatePolicyModal
          setIsViewModalOpen={setIsViewModalOpen}
          ratePolicy={selectedPolicy}
        />
      )}
    </div>
  );
}
