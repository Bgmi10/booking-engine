/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { baseUrl } from "../../../utils/constants";
import { 
  RiUserAddLine, 
  RiRefreshLine, 
  RiSearchLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiUserReceived2Line,
  RiMoneyEuroCircleLine
} from "react-icons/ri";
import { BiLoader } from "react-icons/bi";
import type { User } from "../../../types/types";
import { CreateUserModal } from "./CreateUserModal";
import ManagerCashVerification from "./ManagerCashVerification";
import DailyCashSummary from "./DailyCashSummary";
import ManagerPaymentSummary from "./ManagerPaymentSummary";
import { useAuth } from "../../../context/AuthContext";
import { useUsers } from "../../../hooks/useUsers";

export default function Users() {
  // States
  const { users, loading, setUsers } = useUsers()
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userRole, setUserRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showCashVerification, setShowCashVerification] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const { user: currentUser } = useAuth();
  
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users?.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, users]);

  // Update user role
  const updateUserRole = async (userId: string, role: string) => {
    setLoadingAction(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await fetch(`${baseUrl}/admin/users/${userId}/role`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to update user role");
      }
      
      setSuccess("User role updated successfully!");
      
      // // Update users state
      // setUsers(users.map(user => 
      //   user.id === userId ? { ...user, role } : user
      // ));
      
      // Close modal after success
      setTimeout(() => {
        setIsRoleModalOpen(false);
        setSuccess("");
      }, 2000);
      
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to update user role. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    setLoadingAction(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await fetch(`${baseUrl}/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete user");
      }
      
      setSuccess("User deleted successfully!");
      
      // Update users state
      setUsers(users.filter(user => user.id !== userId));
      
      // Close modal after success
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setSuccess("");
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || "Failed to delete user. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Modal for user details
  const ViewUserModal = () => {
    if (!selectedUser) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
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
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-4xl uppercase overflow-hidden">
                  {selectedUser.profilePicture ? (
                    <img 
                      src={selectedUser.profilePicture} 
                      alt={selectedUser.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedUser.name?.charAt(0) || "U"
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <h4 className="text-sm text-gray-500">Name</h4>
                  <p className="text-lg font-medium">{selectedUser.name || "Not specified"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm text-gray-500">Email</h4>
                  <p className="text-lg">{selectedUser.email}</p>
                </div>
                
                <div className="flex space-x-6">
                  <div>
                    <h4 className="text-sm text-gray-500">Role</h4>
                    <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedUser.role === "ADMIN" 
                        ? "bg-purple-100 text-purple-800" 
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-gray-500">Status</h4>
                    <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedUser.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-gray-500">Joined</h4>
                  <p>{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t pt-4">
              <h4 className="font-medium mb-2">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm text-gray-500">Phone</h5>
                  <p>{selectedUser.phone || "Not provided"}</p>
                </div>
                <div>
                  <h5 className="text-sm text-gray-500">Last Updated</h5>
                  <p>{formatDate(selectedUser.updatedAt)}</p>
                </div>
              </div>
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
    );
  };
  
  // Modal for updating user role
  const UpdateRoleModal = () => {
    if (!selectedUser) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Update User Role</h3>
            <button 
              onClick={() => setIsRoleModalOpen(false)}
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
              <p className="text-sm text-gray-500">
                You are updating the role for:
              </p>
              <p className="font-medium">{selectedUser.name} ({selectedUser.email})</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                disabled={loadingAction}
              >
                <option value="">Select a role</option>
                <option value="MANAGER">MANAGER</option>
                <option value="RECEPTION">RECEPTION</option>
                <option value="ADMIN">ADMIN</option>
                <option value="WAITER">WAITER</option>
                <option value="KITCHEN">KITCHEN</option>
              </select>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={loadingAction}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
              onClick={() => updateUserRole(selectedUser.id, userRole)}
              disabled={!userRole || loadingAction}
            >
              {loadingAction ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Updating...
                </span>
              ) : (
                "Update Role"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Modal for confirming user deletion
  const DeleteUserModal = () => {
    if (!selectedUser) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Delete User</h3>
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
                Are you sure you want to delete this user?
              </h3>
              <p className="text-sm text-gray-500 text-center">
                This action cannot be undone. All data associated with {selectedUser.name} will be permanently removed.
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
              onClick={() => deleteUser(selectedUser.id)}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Deleting...
                </span>
              ) : (
                "Delete User"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage all users and their roles
        </p>
      </div>
      
      {/* Alerts */}
      {error && !isRoleModalOpen && !isDeleteModalOpen && (
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
      
      {success && !isRoleModalOpen && !isDeleteModalOpen && (
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
              placeholder="Search users..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-3">
            <button
            
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <RiRefreshLine className="mr-2 h-5 w-5" />
              Refresh
            </button>
            
            {(currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN') && (
              <>
                <button
                  onClick={() => setShowCashVerification(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                >
                  <RiMoneyEuroCircleLine className="mr-2 h-5 w-5" />
                  Cash Verification
                </button>
                <button
                  onClick={() => setShowDailySummary(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <RiMoneyEuroCircleLine className="mr-2 h-5 w-5" />
                  Daily Summary
                </button>
                <button
                  onClick={() => setShowPaymentSummary(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
                >
                  <RiUserReceived2Line className="mr-2 h-5 w-5" />
                  Payment Summary
                </button>
              </>
            )}
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              <RiUserAddLine className="mr-2 h-5 w-5" />
              Add User
            </button>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <BiLoader className="animate-spin text-indigo-600 mr-2 h-8 w-8" />
              <span className="text-gray-500 text-lg">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No users have been added to the system yet.
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
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
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
                    Joined
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
                {currentItems.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm uppercase overflow-hidden">
                          {user.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            user.name?.charAt(0) || "U"
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || "No name"}
                          </div>
                          {user.phone && (
                            <div className="text-sm text-gray-500">
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "ADMIN" 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsViewModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View Details"
                        >
                          <RiEyeLine size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setUserRole(user.role);
                            setIsRoleModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Change Role"
                        >
                          <RiUserReceived2Line size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete User"
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
        {!loading && filteredUsers.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredUsers.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredUsers.length}</span> users
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
      {isViewModalOpen && <ViewUserModal />}
      {isRoleModalOpen && <UpdateRoleModal />}
      {isDeleteModalOpen && <DeleteUserModal />}
      {isCreateModalOpen && <CreateUserModal  loadingAction={loadingAction} success={success} error={error} setLoadingAction={setLoadingAction} setError={setError} setSuccess={setSuccess} setUsers={setUsers} setIsCreateModalOpen={setIsCreateModalOpen} users={users} />}
      {showCashVerification && <ManagerCashVerification onClose={() => setShowCashVerification(false)} />}
      {showDailySummary && <DailyCashSummary onClose={() => setShowDailySummary(false)} />}
      {showPaymentSummary && <ManagerPaymentSummary onClose={() => setShowPaymentSummary(false)} />}
    </div>
  );
}