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
  RiImageAddLine
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import CreateOrderItemModal from "./CreateOrderItemModal"
import UpdateOrderItemModal from "./UpdateOrderItemModal"
import ViewOrderItemModal from "./ViewOrderItemModal"
import DeleteOrderItemModal from "./DeleteOrderItemModal"
import CreateLocationModal from "./CreateLocationModal"
import UpdateLocationModal from "./UpdateLocationModal"
import DeleteLocationModal from "./DeleteLocationModal"
import QrCodeModal from "./QrCodeModal"
import CreateCategoryModal from "./CreateCategoryModal"
import ViewCategoryProductsModal from "./ViewCategoryProductsModal"
import UpdateCategoryModal from "./UpdateCategoryModal"
import DeleteCategoryModal from "./DeleteCategoryModal"
import type { Category, Location, OrderItem } from "../../../types/types"

export default function OrderItems() {
  // States
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredOrderItems, setFilteredOrderItems] = useState<OrderItem[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false)
  const [isUpdateLocationModalOpen, setIsUpdateLocationModalOpen] = useState(false)
  const [isDeleteLocationModalOpen, setIsDeleteLocationModalOpen] = useState(false)
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false)
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false)
  const [isViewCategoryProductsModalOpen, setIsViewCategoryProductsModalOpen] = useState(false)
  const [isUpdateCategoryModalOpen, setIsUpdateCategoryModalOpen] = useState(false)
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false)
  const [selectedLocationForQr, setSelectedLocationForQr] = useState<Location | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loadingAction, setLoadingAction] = useState(false)
  const [activeTab, setActiveTab] = useState<'orderItems' | 'locations' | 'categories'>('orderItems')

  // Fetch order items
  const fetchOrderItems = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/order-items/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch order items")
      }
      
      const data = await res.json()
      setOrderItems(data.data)
      setFilteredOrderItems(data.data)
    } catch (error) {
      console.error(error)
      setError("Failed to load order items. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch locations
  const fetchLocations = async () => {
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/locations/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch locations")
      }
      
      const data = await res.json()
      setLocations(data.data)
      setFilteredLocations(data.data)
    } catch (error) {
      console.error(error)
      setError("Failed to load locations. Please try again.")
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    setError("")
    try {
      const res = await fetch(`${baseUrl}/admin/order-categories/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch categories")
      }
      
      const data = await res.json()
      setCategories(data.data)
      setFilteredCategories(data.data)
    } catch (error) {
      console.error(error)
      setError("Failed to load categories. Please try again.")
    }
  }

  // Initial load
  useEffect(() => {
    fetchOrderItems()
    fetchLocations()
    fetchCategories()
  }, [])

  // Handle search
  useEffect(() => {
    if (activeTab === 'orderItems') {
      if (searchTerm.trim() === "") {
        setFilteredOrderItems(orderItems)
      } else {
        const filtered = orderItems.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredOrderItems(filtered)
      }
    } else if (activeTab === 'locations') {
      if (searchTerm.trim() === "") {
        setFilteredLocations(locations)
      } else {
        const filtered = locations.filter(
          (location) =>
            location.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredLocations(filtered)
      }
    } else { // Categories tab
      if (searchTerm.trim() === "") {
        setFilteredCategories(categories)
      } else {
        const filtered = categories.filter(
          (category) =>
            category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredCategories(filtered)
      }
    }
    setCurrentPage(1)
  }, [searchTerm, orderItems, locations, categories, activeTab])

  // Create order item
  const createOrderItem = async (formData: {
    name: string
    description: string
    price: number
    imageUrl?: string
    role: string
    tax: number;
  }) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`${baseUrl}/admin/order-items`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          imageUrl: formData.imageUrl,
          role: formData.role,
          tax: formData.tax
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to create order item")
      }
      
      setSuccess("Order item created successfully!")
      fetchOrderItems()
      
      // Close modal immediately after success
      setIsCreateModalOpen(false)
      setSuccess("")
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to create order item. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Update order item
  const updateOrderItem = async (formData: {
    name: string
    description: string
    price: number
    imageUrl?: string
    role: string
    tax: number;
  }) => {
    if (!selectedOrderItem) return
    
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/order-items/${selectedOrderItem.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update order item")
      }
      
      setSuccess("Order item updated successfully!")
      fetchOrderItems()
      
      // Close modal immediately after success
      setIsUpdateModalOpen(false)
      setSuccess("")
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to update order item. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Delete order item
  const deleteOrderItem = async (itemId: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/order-items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete order item")
      }
      
      setSuccess("Order item deleted successfully!")
      
      // Update order items state
      setOrderItems(orderItems.filter(item => item.id !== itemId))
      
      // Close modal immediately after success
      setIsDeleteModalOpen(false)
      setSuccess("")
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to delete order item. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Create location
  const createLocation = async (formData: {
    name: string
    categoryIds: string[]
  }) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/locations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          categoryIds: formData.categoryIds
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to create location")
      }
      
      setSuccess("Location created successfully!")
      fetchLocations()
      
      // Close modal immediately after success
      setIsCreateLocationModalOpen(false)
      setSuccess("")
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to create location. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Update location
  const updateLocation = async (formData: {
    name: string
    categoryIds: string[]
  }) => {
    if (!selectedLocation) return
    
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/locations/${selectedLocation.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          categoryIds: formData.categoryIds
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update location")
      }
      
      setSuccess("Location updated successfully!")
      fetchLocations()
      
      // Close modal immediately after success
      setIsUpdateLocationModalOpen(false)
      setSuccess("")
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to update location. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Delete location
  const deleteLocation = async (locationId: string) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/locations/${locationId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete location")
      }
      
      setSuccess("Location deleted successfully!")
      
      // Update locations state
      setLocations(locations.filter(location => location.id !== locationId))
      
      // Close modal immediately after success
      setIsDeleteLocationModalOpen(false)
      setSuccess("")
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to delete location. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Create category
  const createCategory = async (formData: {
    name: string
    description: string
    imageUrl: string
    isAvailable: boolean
    orderItemIds: string[]
  }) => {
    setLoadingAction(true)
    setError("")
    setSuccess("")
    
    try {
      const res = await fetch(`${baseUrl}/admin/order-categories`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to create category")
      }
      
      setSuccess("Category created successfully!")
      fetchCategories()
      
      setIsCreateCategoryModalOpen(false)
      
    } catch (error: any) {
      console.error(error)
      setError(error.message || "Failed to create category. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  // Toggle product availability
  const toggleProductAvailability = async (product: OrderItem) => {
    // Optimistically update the UI
    setOrderItems(prev =>
      prev.map(p =>
        p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p
      )
    );

    try {
      const res = await fetch(`${baseUrl}/admin/order-items/${product.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isAvailable: !product.isAvailable
        }),
      });

      if (!res.ok) {
        setOrderItems(prev =>
          prev.map(p =>
            p.id === product.id ? { ...p, isAvailable: product.isAvailable } : p
          )
        );
        const data = await res.json();
        throw new Error(data.message || "Failed to update product availability");
      }
      
      setSuccess(`Product "${product.name}" availability updated.`);
      setTimeout(() => setSuccess(""), 3000);

    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setOrderItems(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, isAvailable: product.isAvailable } : p
        )
      );
    }
  };

  // Toggle category availability
  const toggleCategoryAvailability = async (category: Category) => {
    // Optimistically update the UI
    setCategories(prev => 
      prev.map(c => 
        c.id === category.id ? { ...c, isAvailable: !c.isAvailable } : c
      )
    );

    try {
      const res = await fetch(`${baseUrl}/admin/order-categories/${category.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isAvailable: !category.isAvailable
        }),
      });

      if (!res.ok) {
        // Revert on failure
        setCategories(prev => 
          prev.map(c => 
            c.id === category.id ? { ...c, isAvailable: category.isAvailable } : c
          )
        );
        const data = await res.json();
        throw new Error(data.message || "Failed to update category availability");
      }
      
      // Optionally show a success message
      setSuccess(`Category "${category.name}" availability updated.`);
      setTimeout(() => setSuccess(""), 3000);

    } catch (err: any) {
      setError(err.message || "An error occurred.");
      // Revert on failure
      setCategories(prev => 
        prev.map(c => 
          c.id === category.id ? { ...c, isAvailable: category.isAvailable } : c
        )
      );
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentOrderItems = filteredOrderItems.slice(indexOfFirstItem, indexOfLastItem)
  const currentLocations = filteredLocations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil((activeTab === 'orderItems' ? filteredOrderItems.length : activeTab === 'locations' ? filteredLocations.length : filteredCategories.length) / itemsPerPage)
  
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

  // Open update modal
  const openUpdateModal = (item: OrderItem) => {
    setSelectedOrderItem(item)
    setIsUpdateModalOpen(true)
  }

  // Open delete modal
  const openDeleteModal = (item: OrderItem) => {
    setSelectedOrderItem(item)
    setIsDeleteModalOpen(true)
  }

  // Open view modal
  const openViewModal = (item: OrderItem) => {
    setSelectedOrderItem(item)
    setIsViewModalOpen(true)
  }

  // Open update location modal
  const openUpdateLocationModal = (location: Location) => {
    setSelectedLocation(location)
    setIsUpdateLocationModalOpen(true)
  }

  // Open delete location modal
  const openDeleteLocationModal = (location: Location) => {
    setSelectedLocation(location)
    setIsDeleteLocationModalOpen(true)
  }

  // Open QR code modal
  const openQrCodeModal = (location: Location) => {
    setSelectedLocationForQr(location)
    setIsQrCodeModalOpen(true)
  }

  const openViewCategoryProductsModal = (category: Category) => {
    setSelectedCategory(category);
    setIsViewCategoryProductsModalOpen(true);
  };

  const openUpdateCategoryModal = (category: Category) => {
    setSelectedCategory(category);
    setIsUpdateCategoryModalOpen(true);
  };

  const openDeleteCategoryModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteCategoryModalOpen(true);
  };
  
  // Update Category
  const updateCategory = async (id: string, formData: any) => {
    setLoadingAction(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${baseUrl}/admin/order-categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update category");
      }

      setSuccess("Category updated successfully!");
      fetchCategories();
      setIsUpdateCategoryModalOpen(false);
    } catch (error: any) {
      setError(error.message || "Failed to update category.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete Category
  const deleteCategory = async () => {
    if (!selectedCategory) return;

    setLoadingAction(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `${baseUrl}/admin/order-categories/${selectedCategory.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete category");
      }

      setSuccess("Category deleted successfully!");
      fetchCategories();
      setIsDeleteCategoryModalOpen(false);
    } catch (error: any) {
      setError(error.message || "Failed to delete category.");
    } finally {
      setLoadingAction(false);
    }
  };
  
  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage order items and locations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('orderItems')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orderItems'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order Items
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'locations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Locations
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Categories
            </button>
          </nav>
        </div>
      </div>
      
      {/* Alerts */}
      {error && !isDeleteModalOpen && !isUpdateModalOpen && !isCreateModalOpen && !isDeleteLocationModalOpen && !isUpdateLocationModalOpen && !isCreateLocationModalOpen && !isCreateCategoryModalOpen && (
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
      
      {success && !isDeleteModalOpen && !isUpdateModalOpen && !isCreateModalOpen && !isDeleteLocationModalOpen && !isUpdateLocationModalOpen && !isCreateLocationModalOpen && !isCreateCategoryModalOpen && (
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
      
      {/* Actions bar - This is now visible for all tabs */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
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
                if (activeTab === 'orderItems') fetchOrderItems();
                else if (activeTab === 'locations') fetchLocations();
                else if (activeTab === 'categories') fetchCategories();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
            >
              <RiRefreshLine className="mr-2 h-5 w-5" />
              Refresh
            </button>
            
            <button
              onClick={() => {
                if (activeTab === 'orderItems') setIsCreateModalOpen(true);
                else if (activeTab === 'locations') setIsCreateLocationModalOpen(true);
                else if (activeTab === 'categories') setIsCreateCategoryModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none cursor-pointer"
            >
              <RiAddLine className="mr-2 h-5 w-5" />
              {activeTab === 'orderItems' ? 'Add Product' : activeTab === 'locations' ? 'Add Location' : 'Add Category'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Order Items Tab */}
      {activeTab === 'orderItems' && (
        <>
          {/* Order Items Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <BiLoader className="animate-spin text-indigo-600 mr-2 h-8 w-8" />
                  <span className="text-gray-500 text-lg">Loading order items...</span>
                </div>
              ) : filteredOrderItems.length === 0 ? (
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No order items found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No order items have been added to the system yet.
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
                        Item
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
                        VAT
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
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Created
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Available
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
                    {currentOrderItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-10 w-10 object-cover"
                                />
                              ) : (
                                <RiImageAddLine size={20} />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(item.price)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.tax ? item.tax : 0} %</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description.length > 50 
                              ? `${item.description.substring(0, 15)}...` 
                              : item.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* isAvailable toggle */}
                          <button
                            onClick={() => toggleProductAvailability(item)}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                              item.isAvailable ? 'bg-indigo-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                                item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openViewModal(item)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="View Details"
                            >
                              <RiEyeLine size={18} />
                            </button>
                            <button
                              onClick={() => openUpdateModal(item)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit Item"
                            >
                              <RiEdit2Line size={18} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(item)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Item"
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
            {!loading && filteredOrderItems.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredOrderItems.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredOrderItems.length}</span> items
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
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages 
                            ? "text-gray-300 cursor-not-allowed" 
                            : "text-gray-500 hover:bg-gray-50"
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
        </>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <>
          {/* Locations Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              {filteredLocations.length === 0 ? (
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No locations have been added to the system yet.
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
                        Location
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Order Categories
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
                    {currentLocations.map((location) => (
                      <tr key={location.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {location.name.charAt(0).toUpperCase() + location.name.slice(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{location.orderCategories.length} categories</div>
                          {location.orderCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {location.orderCategories.slice(0, 3).map((category) => (
                                <div key={category.id} className="flex items-center bg-gray-100 rounded-full px-2 py-1">
                                  <span className="text-xs text-gray-700 truncate max-w-24">{category.name}</span>
                                </div>
                              ))}
                              {location.orderCategories.length > 3 && (
                                <div className="flex items-center bg-gray-100 rounded-full px-2 py-1">
                                  <span className="text-xs text-gray-500">+{location.orderCategories.length - 3} more</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(location.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openQrCodeModal(location)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="View QR Code"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openUpdateLocationModal(location)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit Location"
                            >
                              <RiEdit2Line size={18} />
                            </button>
                            <button
                              onClick={() => openDeleteLocationModal(location)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Location"
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
            
            {/* Pagination for Locations */}
            {filteredLocations.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredLocations.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredLocations.length}</span> locations
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
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages 
                            ? "text-gray-300 cursor-not-allowed" 
                            : "text-gray-500 hover:bg-gray-50"
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
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
           <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <img src={category.imageUrl} alt={category.name} className="w-12 h-12 rounded-md object-cover" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="font-bold">{category.name}</div>
                          <div className="text-xs text-gray-400">{category.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.orderItems.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* isAvailable toggle */}
                          <button
                            onClick={() => toggleCategoryAvailability(category)}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                              category.isAvailable ? 'bg-indigo-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                                category.isAvailable ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end items-center space-x-2">
                            <button
                              onClick={() => openViewCategoryProductsModal(category)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="View Products"
                            >
                              <RiEyeLine size={18} />
                            </button>
                            <button 
                              onClick={() => openUpdateCategoryModal(category)}
                              className="text-blue-600 hover:text-blue-900 p-1" 
                              title="Edit Category"
                            >
                              <RiEdit2Line size={18} />
                            </button>
                            <button 
                              onClick={() => openDeleteCategoryModal(category)}
                              className="text-red-600 hover:text-red-900 p-1" 
                              title="Delete Category"
                            >
                              <RiDeleteBin6Line size={18} />
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

      {/* Modals */}
      <CreateOrderItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createOrderItem}
        loading={loadingAction}
      />
      
      <UpdateOrderItemModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onSubmit={updateOrderItem}
        orderItem={selectedOrderItem}
        loading={loadingAction}
      />
      
      <ViewOrderItemModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        orderItem={selectedOrderItem}
      />
      
      <DeleteOrderItemModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteOrderItem(selectedOrderItem?.id || '')}
        orderItem={selectedOrderItem}
        loading={loadingAction}
      />
      
      <CreateLocationModal
        isOpen={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
        onSubmit={createLocation}
        categories={categories}
        loading={loadingAction}
      />
      
      <UpdateLocationModal
        key={selectedLocation?.id || 'no-location'}
        isOpen={isUpdateLocationModalOpen}
        onClose={() => setIsUpdateLocationModalOpen(false)}
        onSubmit={updateLocation}
        location={selectedLocation}
        categories={categories}
        loading={loadingAction}
      />
      
      <DeleteLocationModal
        isOpen={isDeleteLocationModalOpen}
        onClose={() => setIsDeleteLocationModalOpen(false)}
        onConfirm={() => deleteLocation(selectedLocation?.id || '')}
        location={selectedLocation}
        loading={loadingAction}
      />
      
      <QrCodeModal
        isOpen={isQrCodeModalOpen}
        onClose={() => setIsQrCodeModalOpen(false)}
        location={selectedLocationForQr}
      />
      
      {isCreateCategoryModalOpen && (
        <CreateCategoryModal
          isOpen={isCreateCategoryModalOpen}
          onClose={() => setIsCreateCategoryModalOpen(false)}
          onCreate={createCategory}
          loading={loadingAction}
          error={error}
        />
      )}

      <ViewCategoryProductsModal
        isOpen={isViewCategoryProductsModalOpen}
        onClose={() => setIsViewCategoryProductsModalOpen(false)}
        category={selectedCategory}
      />

      <UpdateCategoryModal
        isOpen={isUpdateCategoryModalOpen}
        onClose={() => setIsUpdateCategoryModalOpen(false)}
        onUpdate={updateCategory}
        loading={loadingAction}
        error={error}
        category={selectedCategory}
      />

      <DeleteCategoryModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        onConfirm={deleteCategory}
        loading={loadingAction}
        category={selectedCategory}
      />
    </div>
  )
}