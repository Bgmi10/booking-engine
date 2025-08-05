/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { baseUrl } from "../../utils/constants";
import type { User } from "../../types/types";
import { 
  RiEditLine,
  RiSaveLine,
  RiCloseLine,
  RiLockPasswordLine,
  RiUserLine,
  RiCheckLine,
  RiErrorWarningLine
} from "react-icons/ri";
import { BiLoader } from "react-icons/bi";

export default function Profile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editMode, setEditMode] = useState({
    basic: false,
    password: false
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    numberPlate: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/admin/profile`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }
      
      const data = await res.json();
      setProfile(data.data);
      setFormData({
        name: data.data.name,
        email: data.data.email,
        numberPlate: data.data.numberPlate || "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error(error);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateBasicInfo = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = "Invalid email format";
    
    return errors;
  };

  const validatePassword = () => {
    const errors: Record<string, string> = {};
    if (!formData.newPassword) errors.newPassword = "New password is required";
    if (formData.newPassword.length < 6) errors.newPassword = "Password must be at least 6 characters";
    if (formData.newPassword !== formData.confirmPassword) errors.confirmPassword = "Passwords don't match";
    
    return errors;
  };

  const updateProfile = async () => {
    setError("");
    setSuccess("");
    
    const errors = validateBasicInfo();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      const res = await fetch(`${baseUrl}/admin/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          numberPlate: formData.numberPlate || null
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }
      
      setSuccess("Profile updated successfully!");
      setProfile(data.data);
      setEditMode({ ...editMode, basic: false });
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to update profile. Please try again.");
    }
  };

  const updatePassword = async () => {
    setError("");
    setSuccess("");
    
    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      const res = await fetch(`${baseUrl}/admin/profile/change-password`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          newPassword: formData.newPassword
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to update password");
      }
      
      setSuccess("Password updated successfully!");
      setEditMode({ ...editMode, password: false });
      setFormData({
        ...formData,
        newPassword: "",
        confirmPassword: ""
      });
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to update password. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <BiLoader className="animate-spin text-indigo-600 text-4xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <RiErrorWarningLine className="mx-auto text-red-500 text-4xl" />
          <p className="mt-2 text-lg text-gray-700">Failed to load profile</p>
          <button
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account information and security
          </p>
        </div>
        
        {/* Alerts */}
        {error && (
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
        
        {success && (
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
        
        {/* Profile Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-2xl uppercase overflow-hidden">
                  {profile.profilePicture ? (
                    <img 
                      src={profile.profilePicture} 
                      alt={profile.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile.name?.charAt(0) || "U"
                  )}
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-gray-900">{profile.name}</h2>
                  <p className="text-sm text-gray-500">{profile.role}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Member since {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>
          
          {/* Basic Information Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <RiUserLine className="mr-2 text-indigo-600" />
                Basic Information
              </h3>
              {editMode.basic ? (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditMode({ ...editMode, basic: false });
                      setFormData({
                        ...formData,
                        name: profile.name,
                        email: profile.email,
                        numberPlate: profile.numberPlate || ""
                      });
                      setFormErrors({});
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <RiCloseLine size={20} />
                  </button>
                  <button
                    onClick={updateProfile}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <RiSaveLine size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditMode({ ...editMode, basic: true })}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <RiEditLine size={20} />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {editMode.basic ? (
                  <>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-900">{profile.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {editMode.basic ? (
                  <>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border ${
                        formErrors.email ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-900">{profile.email}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                {editMode.basic ? (
                  <>
                    <input
                      type="text"
                      name="numberPlate"
                      value={formData.numberPlate}
                      onChange={handleInputChange}
                      placeholder="ABC123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional. Used for automatic gate access control.
                    </p>
                  </>
                ) : (
                  <p className="text-gray-900">{profile.numberPlate || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Password Section */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <RiLockPasswordLine className="mr-2 text-indigo-600" />
                Password
              </h3>
              {editMode.password ? (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditMode({ ...editMode, password: false });
                      setFormData({
                        ...formData,
                        newPassword: "",
                        confirmPassword: ""
                      });
                      setFormErrors({});
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <RiCloseLine size={20} />
                  </button>
                  <button
                    onClick={updatePassword}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <RiSaveLine size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditMode({ ...editMode, password: true })}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <RiEditLine size={20} />
                </button>
              )}
            </div>
            
            {editMode.password ? (
              <div className="space-y-4">    
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${
                      formErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {formErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.newPassword}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${
                      formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {formErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Last changed: {profile.updatedAt ? formatDate(profile.updatedAt) : 'Never'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}