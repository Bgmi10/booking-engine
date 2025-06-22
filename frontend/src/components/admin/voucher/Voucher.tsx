import { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  Plus,
} from "lucide-react";
import { baseUrl } from "../../../utils/constants";
import type { RatePolicy, Room, Voucher, VoucherProduct } from "../../../types/types";


const tabs = [
  { id: "products", label: "Voucher Products" },
  { id: "vouchers", label: "Vouchers" },
];

export default function Voucher() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [voucherProducts, setVoucherProducts] = useState<VoucherProduct[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VoucherProduct | Voucher | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, vouchersRes, roomsRes, ratePoliciesRes] = await Promise.all([
        fetch(`${baseUrl}/admin/voucher/products/all`, { credentials: "include" }),
        fetch(`${baseUrl}/admin/vouchers/all`, { credentials: "include" }),
        fetch(`${baseUrl}/rooms/all`, { credentials: "include" }),
        fetch(`${baseUrl}/admin/rate-policies/all`, { credentials: "include" }),
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setVoucherProducts(productsData.data || []);
      }

      if (vouchersRes.ok) {
        const vouchersData = await vouchersRes.json();
        setVouchers(vouchersData.data || []);
      }

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData.data || []);
      }

      if (ratePoliciesRes.ok) {
        const ratePoliciesData = await ratePoliciesRes.json();
        setRatePolicies(ratePoliciesData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setAlert({ type: "error", message: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle create/update voucher product
  const handleSaveVoucherProduct = async (product: Omit<VoucherProduct, "id" | "createdAt" | "updatedAt">) => {
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = editingItem 
        ? `${baseUrl}/admin/voucher/products/${editingItem.id}`
        : `${baseUrl}/admin/voucher/products`;

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!response.ok) throw new Error("Failed to save voucher product");

      setAlert({ type: "success", message: `Voucher product ${editingItem ? "updated" : "created"} successfully!` });
      setIsCreateModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error("Error saving voucher product:", error);
      setAlert({ type: "error", message: "Failed to save voucher product" });
    }
  };

  // Handle create/update voucher
  const handleSaveVoucher = async (voucher: Omit<Voucher, "id" | "createdAt" | "updatedAt" | "currentUsage" | "createdBy" | "products">) => {
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = editingItem 
        ? `${baseUrl}/admin/vouchers/${editingItem.id}`
        : `${baseUrl}/admin/vouchers`;

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voucher),
      });

      if (!response.ok) throw new Error("Failed to save voucher");

      setAlert({ type: "success", message: `Voucher ${editingItem ? "updated" : "created"} successfully!` });
      setIsCreateModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error("Error saving voucher:", error);
      setAlert({ type: "error", message: "Failed to save voucher" });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const url = activeTab === "products" 
        ? `${baseUrl}/admin/voucher/produts/${itemToDelete}`
        : `${baseUrl}/admin/vouchers/${itemToDelete}`;

      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to delete item");

      setAlert({ type: "success", message: "Item deleted successfully!" });
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting item:", error);
      setAlert({ type: "error", message: "Failed to delete item" });
    }
  };

  // Filter items based on search term
  const filteredProducts = voucherProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVouchers = vouchers.filter(voucher =>
    voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voucher Management</h1>
          <p className="text-gray-600 mt-1">Manage voucher products and discount vouchers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create {activeTab === "products" ? "Product" : "Voucher"}
          </button>
        </div>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-lg border-l-4 ${
            alert.type === "error"
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-green-500 bg-green-50 text-green-700"
          }`}
        >
          <div className="flex items-center">
            {alert.type === "error" ? (
              <AlertTriangle className="h-5 w-5 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            <span>{alert.message}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${activeTab === "products" ? "products" : "vouchers"}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : activeTab === "products" ? (
        <VoucherProductsTable
          products={filteredProducts}
          onEdit={(product) => {
            setEditingItem(product);
            setIsCreateModalOpen(true);
          }}
          onDelete={(id) => {
            setItemToDelete(id);
            setIsDeleteModalOpen(true);
          }}
        />
      ) : (
        <VouchersTable
          vouchers={filteredVouchers}
          onEdit={(voucher) => {
            setEditingItem(voucher);
            setIsCreateModalOpen(true);
          }}
          onDelete={(id) => {
            setItemToDelete(id);
            setIsDeleteModalOpen(true);
          }}
        />
      )}

      {/* Create/Edit Modal */}
      {isCreateModalOpen && activeTab === "products" && (
        <VoucherProductModal
          product={editingItem as VoucherProduct | null}
          onSave={handleSaveVoucherProduct}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {isCreateModalOpen && activeTab === "vouchers" && (
        <VoucherModal
          voucher={editingItem as Voucher | null}
          products={voucherProducts}
          rooms={rooms}
          ratePolicies={ratePolicies}
          onSave={handleSaveVoucher}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {activeTab === "products" ? "product" : "voucher"}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Voucher Products Table Component
function VoucherProductsTable({
  products,
  onEdit,
  onDelete,
}: {
  products: VoucherProduct[];
  onEdit: (product: VoucherProduct) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No voucher products found. Create your first product to get started.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.imageUrl && (
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-md" src={product.imageUrl} alt={product.name} />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${product.value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Vouchers Table Component
function VouchersTable({
  vouchers,
  onEdit,
  onDelete,
}: {
  vouchers: Voucher[];
  onEdit: (voucher: Voucher) => void;
  onDelete: (id: string) => void;
}) {
  const getDiscountText = (voucher: Voucher) => {
    switch (voucher.type) {
      case "DISCOUNT":
        return `${voucher.discountPercent}% off`;
      case "FIXED":
        return `$${voucher.fixedAmount?.toFixed(2)} off`;
      case "PRODUCT":
        return `${voucher.products.length} product(s)`;
      default:
        return "";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No vouchers found. Create your first voucher to get started.
                </td>
              </tr>
            ) : (
              vouchers.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {voucher.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{voucher.name}</div>
                    {voucher.description && (
                      <div className="text-sm text-gray-500">{voucher.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getDiscountText(voucher)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voucher.currentUsage}{voucher.maxUsage ? ` / ${voucher.maxUsage}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(voucher.validFrom).toLocaleDateString()} - {new Date(voucher.validTill).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      voucher.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {voucher.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(voucher)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(voucher.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Voucher Product Modal Component
function VoucherProductModal({
  product,
  onSave,
  onClose,
}: {
  product: VoucherProduct | null;
  onSave: (product: Omit<VoucherProduct, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    value: product?.value || 0,
    isActive: product?.isActive ?? true,
  });

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? "Edit Voucher Product" : "Create Voucher Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img src={formData.imageUrl} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={(e) => handleChange("value", parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Voucher Modal Component
function VoucherModal({
  voucher,
  products,
  rooms,
  ratePolicies,
  onSave,
  onClose,
}: {
  voucher: Voucher | null;
  products: VoucherProduct[];
  rooms: Room[];
  ratePolicies: RatePolicy[];
  onSave: (voucher: Omit<Voucher, "id" | "createdAt" | "updatedAt" | "currentUsage" | "createdBy" | "products">) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    code: voucher?.code || "",
    name: voucher?.name || "",
    description: voucher?.description || "",
    type: voucher?.type || "DISCOUNT",
    discountPercent: voucher?.discountPercent || null,
    fixedAmount: voucher?.fixedAmount || null,
    maxUsage: voucher?.maxUsage || null,
    maxUsagePerUser: voucher?.maxUsagePerUser || null,
    validFrom: voucher?.validFrom ? voucher.validFrom.split("T")[0] : "",
    validTill: voucher?.validTill ? voucher.validTill.split("T")[0] : "",
    roomScope: voucher?.roomScope || "ALL_ROOMS",
    roomIds: voucher?.roomIds || [],
    rateScope: voucher?.rateScope || "ALL_RATES",
    ratePolicyIds: voucher?.ratePolicyIds || [],
    isActive: voucher?.isActive ?? true,
    productIds: voucher?.productIds || [],
  });

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const handleRoomChange = (roomId: string) => {
    setFormData(prev => ({
      ...prev,
      roomIds: prev.roomIds.includes(roomId)
        ? prev.roomIds.filter(id => id !== roomId)
        : [...prev.roomIds, roomId]
    }));
  };

  const handleRatePolicyChange = (ratePolicyId: string) => {
    setFormData(prev => ({
      ...prev,
      ratePolicyIds: prev.ratePolicyIds.includes(ratePolicyId)
        ? prev.ratePolicyIds.filter(id => id !== ratePolicyId)
        : [...prev.ratePolicyIds, ratePolicyId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      validFrom: new Date(formData.validFrom).toISOString(),
      validTill: new Date(formData.validTill).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {voucher ? "Edit Voucher" : "Create Voucher"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DISCOUNT">Percentage Discount</option>
                  <option value="FIXED">Fixed Amount Discount</option>
                  <option value="PRODUCT">Free Product</option>
                </select>
              </div>

              {formData.type === "DISCOUNT" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percent *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discountPercent || ""}
                    onChange={(e) => handleChange("discountPercent", e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={formData.type === "DISCOUNT"}
                  />
                </div>
              )}

              {formData.type === "FIXED" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.fixedAmount || ""}
                    onChange={(e) => handleChange("fixedAmount", e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={formData.type === "FIXED"}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Usage (leave empty for unlimited)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUsage || ""}
                  onChange={(e) => handleChange("maxUsage", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Usage Per User (leave empty for unlimited)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUsagePerUser || ""}
                  onChange={(e) => handleChange("maxUsagePerUser", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => handleChange("validFrom", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Till *</label>
                <input
                  type="date"
                  value={formData.validTill}
                  onChange={(e) => handleChange("validTill", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Room Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Scope</label>
              <select
                value={formData.roomScope}
                onChange={(e) => handleChange("roomScope", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="ALL_ROOMS">All Rooms</option>
                <option value="SPECIFIC_ROOMS">Specific Rooms</option>
              </select>

              {formData.roomScope === "SPECIFIC_ROOMS" && (
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {rooms.map((room) => (
                    <label key={room.id} className="flex items-center mb-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={formData.roomIds.includes(room.id)}
                        onChange={() => handleRoomChange(room.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{room.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rate Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Scope</label>
              <select
                value={formData.rateScope}
                onChange={(e) => handleChange("rateScope", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="ALL_RATES">All Rates</option>
                <option value="SPECIFIC_RATES">Specific Rates</option>
              </select>

              {formData.rateScope === "SPECIFIC_RATES" && (
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {ratePolicies.map((ratePolicy) => (
                    <label key={ratePolicy.id} className="flex items-center mb-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={formData.ratePolicyIds.includes(ratePolicy.id)}
                        onChange={() => handleRatePolicyChange(ratePolicy.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{ratePolicy.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Product Selection (for PRODUCT type vouchers) */}
            {formData.type === "PRODUCT" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Products *</label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {products.map((product) => (
                    <label key={product.id} className="flex items-center mb-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={formData.productIds.includes(product.id)}
                        onChange={() => handleProductChange(product.id)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{product.name} (${product.value.toFixed(2)})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}