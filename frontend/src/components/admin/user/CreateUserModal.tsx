/* eslint-disable @typescript-eslint/no-explicit-any */
import type { User } from "../../../types/types";
import { useState } from "react";
import { baseUrl } from "../../../utils/constants";
import { RiCheckLine } from "react-icons/ri";
import { RiCloseLine } from "react-icons/ri";
import { BiLoader } from "react-icons/bi";

    export const CreateUserModal = ({setLoadingAction, setError, setSuccess, setUsers, setIsCreateModalOpen, users, success, error, loadingAction}: {setLoadingAction: (loading: boolean) => void, setError: (error: string) => void, setSuccess: (success: string) => void, setUsers: (users: User[]) => void, setIsCreateModalOpen: (isCreateModalOpen: boolean) => void, users: User[], success: string, error: string, loadingAction: boolean }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "USER",
        phone: "",
        numberPlate: ""
      });
    
    
      const createUser = async () => {
        setLoadingAction(true);
        setError("");
        setSuccess("");
    
        try {
          const res = await fetch(`${baseUrl}/admin/users`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.message || "Failed to create user");
          }
          
          setSuccess("User created successfully!");
          
          // Update users state
          setUsers([data.data, ...users]);
          
          // Reset form and close modal after success
          setTimeout(() => {
            setFormData({
              name: "",
              email: "",
              password: "",
              role: "USER",
              phone: "",
              numberPlate: ""
            });
            setIsCreateModalOpen(false);
            setSuccess("");
          }, 2000);
          
        } catch (error: any) {
          console.error(error);
          setError(error.message || "Failed to create user. Please try again.");
        } finally {
          setLoadingAction(false);
        }
      };
    

    const handleInputChange = (e: any) => {
      const { name, value } = e.target;   
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              disabled={loadingAction}
            >
              <RiCloseLine   size={24} />
            </button>
          </div>
          
          <div className="p-6">
            
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

            {
              error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <RiCloseLine className="h-5 w-5 text-red-400" />
                    </div> 
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )
            }
            
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => {setFormData({...formData, name: e.target.value})}}
                  className={`mt-1 border-gray-300 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />

              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 border-gray-300 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`mt-1 border-gray-300 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`mt-1 border-gray-300 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
              </div>
              
              <div>
                <label htmlFor="numberPlate" className="block text-sm font-medium text-gray-700">
                  License Plate Number
                </label>
                <input
                  type="text"
                  id="numberPlate"
                  name="numberPlate"
                  value={formData.numberPlate}
                  onChange={handleInputChange}
                  placeholder="ABC123"
                  className={`mt-1 border-gray-300 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional. Used for automatic gate access control.
                </p>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`mt-1 border-gray-300 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                >
                <option value="">Select a role</option>
                <option value="RECEPTION">RECEPTION</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="WAITER">WAITER</option>
                <option value="KITCHEN">KITCHEN</option>
                </select>
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
              onClick={createUser}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Creating...
                </span>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };