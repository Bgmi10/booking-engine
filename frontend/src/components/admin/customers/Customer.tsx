import { Plus, RefreshCw, MoreHorizontal, Edit, Trash2, Calendar, CreditCard, Eye, History } from "lucide-react";
import { useState, useEffect } from "react";
import { useCustomers } from "../../../hooks/useCustomers";
import type { Customer as CustomerType } from "../../../hooks/useCustomers";
import CustomerBookings from "./CustomerBookings";
import { CreateCustomerModal } from "./CreateCustomerModal";
import { EditCustomerModal } from "./EditCustomerModal";
import { baseUrl } from "../../../utils/constants";
import ChargeModal from "./ChargeModal";
import PaymentHistoryModal from "./PaymentHistoryModal";

export default function Customer () {
    const { customers, loading, refetch } = useCustomers();
    const [isCeateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
    const [showBookings, setShowBookings] = useState(false);
    const [search, setSearch] = useState("");
    const [vipFilter, setVipFilter] = useState("ALL");
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [viewUserModal, setViewUserModal] = useState<{ open: boolean; user: CustomerType | null }>({ open: false, user: null });
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);

    console.log(customers)

    // Handle clicking outside dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleEdit = (customer: CustomerType) => {
        setSelectedCustomer(customer);
        setIsEditModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = async (customer: CustomerType) => {
        if (!window.confirm(`Are you sure you want to delete ${customer.guestFirstName} ${customer.guestLastName}?`)) return;
        try {
            const response = await fetch(baseUrl + `/admin/customers/${customer.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (response.ok) {
                refetch();
            } else {
                alert("Failed to delete customer");
            }
        } catch (e) {
            alert("Failed to delete customer");
        }
        setOpenDropdown(null);
    };

    const handleShowBookings = (customer: CustomerType) => {
        setSelectedCustomer(customer);
        setShowBookings(true);
        setOpenDropdown(null);
    };

    const handleCharge = (customer: CustomerType) => {
        setSelectedCustomer(customer);
        setIsChargeModalOpen(true);
        setOpenDropdown(null);
    };

    const handlePaymentHistory = (customer: CustomerType) => {
        setSelectedCustomer(customer);
        setIsPaymentHistoryModalOpen(true);
        setOpenDropdown(null);
    };

    const handleViewDetails = (customer: CustomerType) => {
        setViewUserModal({ open: true, user: customer });
        setOpenDropdown(null);
    };

    const toggleDropdown = (customerId: string) => {
        setOpenDropdown(openDropdown === customerId ? null : customerId);
    };

    function formatDate(dateString: string | null | undefined) {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString();
    }

    return(
        <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          </div>
          <div className="gap-2 flex">
            <button
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
  
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className={`h-4 w-4 mr-2`} />
              Create Customer
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center mb-2">
          <input
            type="text"
            placeholder="Search by name, email, phone, nationality..."
            className="border rounded px-3 py-2 w-72"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2"
            value={vipFilter}
            onChange={e => setVipFilter(e.target.value)}
          >
            <option value="ALL">All VIP Status</option>
            <option value="VIP">VIP Only</option>
            <option value="NON_VIP">Non-VIP Only</option>
          </select>
        </div>
        <div className="bg-white rounded-lg shadow mt-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Nights Stayed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Money Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8">No customers found.</td></tr>
              ) : (
                customers
                  .filter(customer => {
                    if (vipFilter === "VIP" && !customer.vipStatus) return false;
                    if (vipFilter === "NON_VIP" && customer.vipStatus) return false;
                    return true;
                  })
                  .filter(customer => {
                    const searchText = search.toLowerCase();
                    return (
                      customer.guestFirstName?.toLowerCase().includes(searchText) ||
                      customer.guestLastName?.toLowerCase().includes(searchText) ||
                      customer.guestEmail?.toLowerCase().includes(searchText) ||
                      customer.guestPhone?.toLowerCase().includes(searchText) ||
                      customer.guestNationality?.toLowerCase().includes(searchText)
                    );
                  })
                  .map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestFirstName} {customer.guestLastName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestPhone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestNationality || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">{customer.totalNightStayed ?? '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">{customer.totalMoneySpent !== 0 ? `€${customer.totalMoneySpent}` : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {customer.vipStatus ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">VIP</span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => toggleDropdown(customer.id.toString())}
                            className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4 text-gray-600" />
                          </button>
                          
                          {openDropdown === customer.id.toString() && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <button
                                  onClick={() => handleEdit(customer)}
                                  className="flex items-center w-full px-4 py-2 text-sm cursor-pointer text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Edit className="h-4 w-4 mr-3 text-yellow-600" />
                                  Edit Customer
                                </button>
                                <button
                                  onClick={() => handleShowBookings(customer)}
                                  className="flex items-center w-full px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Calendar className="h-4 w-4 mr-3 text-blue-600" />
                                  View Bookings
                                </button>
                                <button
                                  onClick={() => handleCharge(customer)}
                                  className="flex items-center w-full px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <CreditCard className="h-4 w-4 mr-3 text-purple-600" />
                                  Charge Customer
                                </button>
                                <button
                                  onClick={() => handlePaymentHistory(customer)}
                                  className="flex items-center w-full px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <History className="h-4 w-4 mr-3 text-green-600" />
                                  Charge History
                                </button>
                                <button
                                  onClick={() => handleViewDetails(customer)}
                                  className="flex items-center w-full px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Eye className="h-4 w-4 mr-3 text-gray-600" />
                                  View Details
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDelete(customer)}
                                  className="flex items-center w-full px-4 py-2 cursor-pointer text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  Delete Customer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        {showBookings && selectedCustomer && (
          <CustomerBookings
            customer={selectedCustomer}
            onClose={() => setShowBookings(false)}
          />
        )}
        {isCeateModalOpen && (
          <CreateCustomerModal
            setIsCreateModalOpen={setIsCreateModalOpen}
            fetchCustomers={refetch}
          />
        )}
        {isEditModalOpen && selectedCustomer && (
          <EditCustomerModal
            customer={selectedCustomer}
            setIsEditModalOpen={setIsEditModalOpen}
            fetchCustomers={refetch}
          />
        )}
        {isChargeModalOpen && selectedCustomer && (
            <ChargeModal
                customer={selectedCustomer}
                onClose={() => setIsChargeModalOpen(false)}
            />
        )}
        {isPaymentHistoryModalOpen && selectedCustomer && (
            <PaymentHistoryModal
                customer={selectedCustomer}
                onClose={() => setIsPaymentHistoryModalOpen(false)}
            />
        )}
        {/* View User Modal */}
        {viewUserModal.open && viewUserModal.user && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-lg">
              <button
                onClick={() => setViewUserModal({ open: false, user: null })}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                User Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Total Nights Stayed</div>
                    <div className="font-medium text-gray-900">{viewUserModal.user.totalNightStayed ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total Money Spent</div>
                    <div className="font-medium text-gray-900">{viewUserModal.user.totalMoneySpent !== 0 ? `€${viewUserModal.user.totalMoneySpent}` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Anniversary Date</div>
                    <div className="font-medium text-gray-900">{formatDate((viewUserModal.user as any).anniversaryDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Date of Birth</div>
                    <div className="font-medium text-gray-900">{formatDate((viewUserModal.user as any).dob)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Passport Number</div>
                    <div className="font-medium text-gray-900">{(viewUserModal.user as any).passportNumber || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Passport Expiry</div>
                    <div className="font-medium text-gray-900">{formatDate((viewUserModal.user as any).passportExpiry)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Favorite Items</div>
                    <div className="font-medium text-gray-900">{(viewUserModal.user as any).favoriteItems ? JSON.stringify((viewUserModal.user as any).favoriteItems) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Created At</div>
                    <div className="font-medium text-gray-900">{formatDate((viewUserModal.user as any).createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Updated At</div>
                    <div className="font-medium text-gray-900">{formatDate((viewUserModal.user as any).updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
    )
}