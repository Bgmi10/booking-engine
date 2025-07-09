import { Plus, RefreshCw, MoreHorizontal, Edit, Trash2, Calendar, CreditCard, Eye, History, User, Users, ListOrdered } from "lucide-react";
import { useState, useEffect } from "react";
import { useCustomers } from "../../../hooks/useCustomers";
import type { Customer as CustomerType } from "../../../hooks/useCustomers";
import CustomerBookings from "./CustomerBookings";
import { CreateCustomerModal } from "./CreateCustomerModal";
import { EditCustomerModal } from "./EditCustomerModal";
import { baseUrl } from "../../../utils/constants";
import ChargeModal from "./ChargeModal";
import PaymentHistoryModal from "./PaymentHistoryModal";
import TempCustomerOrdersModal from "./TempCustomerOrdersModal";

interface TempCustomer {
    id: string;
    surname: string;
    createdAt: string;
    guestEmail?: string;
}

const CustomerTypeSwitch = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: 'regular' | 'temporary') => void }) => (
    <div className="bg-gray-200 p-1 rounded-lg flex w-fit">
        <button
            onClick={() => setActiveTab('regular')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'regular' ? 'bg-white text-gray-800 shadow' : 'bg-transparent text-gray-600'}`}
        >
             <Users className="h-4 w-4 mr-2 inline-block" />
            Booking Customers
        </button>
        <button
            onClick={() => setActiveTab('temporary')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'temporary' ? 'bg-white text-gray-800 shadow' : 'bg-transparent text-gray-600'}`}
        >
            <User className="h-4 w-4 mr-2 inline-block" />
            Temporary Guests
        </button>
    </div>
);

export default function Customer() {
    // Regular customer state
    const { customers, loading, refetch } = useCustomers();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(null);
    const [showBookings, setShowBookings] = useState(false);
    const [search, setSearch] = useState("");
    const [vipFilter, setVipFilter] = useState("ALL");
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    //@ts-ignore
    const [viewUserModal, setViewUserModal] = useState<{ open: boolean; user: CustomerType | null }>({ open: false, user: null });
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
    const [customerForHistory, setCustomerForHistory] = useState<CustomerType | TempCustomer | null>(null);
    const [customerTypeForHistory, setCustomerTypeForHistory] = useState<'regular' | 'temporary' | null>(null);

    // New state for temporary customers
    const [activeTab, setActiveTab] = useState<'regular' | 'temporary'>('regular');
    const [tempCustomers, setTempCustomers] = useState<TempCustomer[]>([]);
    const [isTempLoading, setIsTempLoading] = useState(false);

    const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
    const [selectedTempCustomer, setSelectedTempCustomer] = useState<TempCustomer | null>(null);

    const fetchTempCustomers = async () => {
        setIsTempLoading(true);
        try {
            const response = await fetch(`${baseUrl}/admin/temp-customers/all`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch temporary guests.');
            const data = await response.json();
            setTempCustomers(data.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsTempLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'temporary') {
            fetchTempCustomers();
        } else {
            refetch();
        }
    }, [activeTab]);

    // Handle clicking outside dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEdit = (customer: CustomerType) => {
        setSelectedCustomer(customer);
        setIsEditModalOpen(true);
        setOpenDropdown(null);
    };

    const handleDelete = async (customer: CustomerType) => {
        if (!window.confirm(`Are you sure you want to delete ${customer.guestFirstName} ${customer.guestLastName}?`)) return;
        try {
            const response = await fetch(`${baseUrl}/admin/customers/${customer.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (response.ok) refetch();
            else alert("Failed to delete customer");
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
        setCustomerForHistory(customer);
        setCustomerTypeForHistory('regular');
        setIsPaymentHistoryModalOpen(true);
        setOpenDropdown(null);
    };

    const handleTempPaymentHistory = (customer: TempCustomer) => {
        setCustomerForHistory(customer);
        setCustomerTypeForHistory('temporary');
        setIsPaymentHistoryModalOpen(true);
        setOpenDropdown(null);
    };

    const handleTempViewOrders = (customer: TempCustomer) => {
        setSelectedTempCustomer(customer);
        setIsOrdersModalOpen(true);
        setOpenDropdown(null);
    }

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
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const renderRegularCustomers = () => (
        <>
        <div className="flex flex-wrap gap-4 items-center mb-2">
          <input
            type="text"
                    placeholder="Search by name, email, phone..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                            <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : (
                customers
                                .filter(c => (vipFilter === "ALL" || (vipFilter === "VIP" && c.vipStatus) || (vipFilter === "NON_VIP" && !c.vipStatus)))
                                .filter(c => [c.guestFirstName, c.guestLastName, c.guestEmail, c.guestPhone].some(field => field?.toLowerCase().includes(search.toLowerCase())))
                  .map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestFirstName} {customer.guestLastName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{customer.guestPhone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {customer.vipStatus ? <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">VIP</span> : <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">No</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative dropdown-container">
                                                <button onClick={() => toggleDropdown(customer.id.toString())} className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full">
                            <MoreHorizontal className="h-4 w-4 text-gray-600" />
                          </button>
                          {openDropdown === customer.id.toString() && (
                                                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                              <div className="py-1">
                                                            <button onClick={() => handleEdit(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Edit className="h-4 w-4 mr-3 text-yellow-600" />Edit</button>
                                                            <button onClick={() => handleShowBookings(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Calendar className="h-4 w-4 mr-3 text-blue-600" />Bookings</button>
                                                            <button onClick={() => handleCharge(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><CreditCard className="h-4 w-4 mr-3 text-purple-600" />Charge</button>
                                                            <button onClick={() => handlePaymentHistory(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><History className="h-4 w-4 mr-3 text-green-600" />History</button>
                                                            <button onClick={() => handleViewDetails(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Eye className="h-4 w-4 mr-3 text-gray-600" />Details</button>
                                                            <hr className="my-1" />
                                                            <button onClick={() => handleDelete(customer)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-3" />Delete</button>
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
        </>
    );

    const renderTempCustomers = () => (
        <>
            <div className="flex flex-wrap gap-4 items-center mb-2">
                <input
                    type="text"
                    placeholder="Search by surname..."
                    className="border rounded px-3 py-2 w-72"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <div className="bg-white rounded-lg shadow mt-6">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surname</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isTempLoading ? (
                             <tr><td colSpan={3} className="text-center py-8">Loading...</td></tr>
                        ) : (
                            tempCustomers
                                .filter(c => c.surname.toLowerCase().includes(search.toLowerCase()))
                                .map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{customer.surname}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(customer.createdAt)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="relative dropdown-container">
                                                <button onClick={() => toggleDropdown(customer.id)} className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full">
                                                    <MoreHorizontal className="h-4 w-4 text-gray-600" />
                                </button>
                                                {openDropdown === customer.id && (
                                                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                                                        <div className="py-1">
                                                            <button onClick={() => handleTempViewOrders(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                                <ListOrdered className="h-4 w-4 mr-3 text-blue-600" />
                                                                View Orders
                                </button>
                                                            <button onClick={() => handleTempPaymentHistory(customer)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                  <History className="h-4 w-4 mr-3 text-green-600" />
                                                                History
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
        </>
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
                </div>
                <div className="gap-2 flex">
                    <button
                        onClick={activeTab === 'regular' ? refetch : fetchTempCustomers}
                        disabled={loading || isTempLoading}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isTempLoading) ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    {activeTab === 'regular' && (
              <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                            <Plus className={`h-4 w-4 mr-2`} />
                            Create Customer
              </button>
                    )}
              </div>
            </div>
            
            <CustomerTypeSwitch activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSearch(''); }} />
            
            {activeTab === 'regular' ? renderRegularCustomers() : renderTempCustomers()}

            {isCreateModalOpen && <CreateCustomerModal setIsCreateModalOpen={setIsCreateModalOpen} fetchCustomers={refetch} />}
            {isEditModalOpen && selectedCustomer && <EditCustomerModal customer={selectedCustomer} setIsEditModalOpen={setIsEditModalOpen} fetchCustomers={refetch} />}
            {showBookings && selectedCustomer && <CustomerBookings customer={selectedCustomer} onClose={() => setShowBookings(false)} />}
            {isChargeModalOpen && selectedCustomer && <ChargeModal customer={selectedCustomer} onClose={() => setIsChargeModalOpen(false)} />}
            {isPaymentHistoryModalOpen && customerForHistory && customerTypeForHistory && (
                <PaymentHistoryModal 
                    customer={customerForHistory}
                    customerType={customerTypeForHistory}
                    onClose={() => {
                        setIsPaymentHistoryModalOpen(false);
                        setCustomerForHistory(null);
                        setCustomerTypeForHistory(null);
                    }} 
                />
            )}
            {isOrdersModalOpen && selectedTempCustomer && (
                <TempCustomerOrdersModal
                    customer={selectedTempCustomer}
                    onClose={() => {
                        setIsOrdersModalOpen(false);
                        setSelectedTempCustomer(null);
                    }}
                />
        )}
        </div>
    );
}