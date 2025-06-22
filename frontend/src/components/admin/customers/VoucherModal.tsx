import { useEffect, useState } from "react";
import { Gift, Calendar, Users, Package, Percent, DollarSign, Tag, Clock, CheckCircle, XCircle, X } from "lucide-react";
import { baseUrl } from "../../../utils/constants";

// Define the Voucher type based on your data structure
type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  value: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Voucher = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  createdBy: string | null;
  currentUsage: number;
  discountPercent: number | null;
  fixedAmount: number | null;
  isActive: boolean;
  maxUsage: number;
  maxUsagePerUser: number;
  productIds: string[];
  products?: Product[];
  ratePolicyIds: string[];
  rateScope: string;
  roomIds: string[];
  roomScope: string;
  updatedAt: string;
  validFrom: string;
  validTill: string;
};

export default function VoucherModal({ 
  voucherId, 
  onClose 
}: { 
  voucherId: string; 
  onClose: () => void;
}) {
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        setLoading(true);
        const response = await fetch(baseUrl + `/admin/vouchers/${voucherId}`, {
          method: "GET",
          credentials: "include"
        });

        const data = await response.json();
        setVoucher(data.data);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [voucherId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDiscountDisplay = () => {
    if (voucher?.discountPercent) {
      return `${voucher.discountPercent}%`;
    }
    if (voucher?.fixedAmount) {
      return `$${voucher.fixedAmount}`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6">
          <div className="text-center text-gray-500">
            <XCircle className="mx-auto h-12 w-12 mb-4" />
            <p>Voucher not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Voucher Details</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              voucher.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {voucher.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {voucher.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Main Information Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-gray-600">
                    <Tag className="h-4 w-4" />
                    Code
                  </span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {voucher.code}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="flex items-center gap-2 text-gray-600">
                    <Gift className="h-4 w-4" />
                    Name
                  </span>
                  <span className="text-right font-medium">{voucher.name}</span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="flex items-center gap-2 text-gray-600">
                    Type
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {voucher.type}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Description</span>
                  <span className="text-right max-w-48">{voucher.description}</span>
                </div>
              </div>
            </div>

            {/* Discount & Usage */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Discount & Usage</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-gray-600">
                    {voucher.discountPercent ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                    Discount
                  </span>
                  <span className="font-semibold text-green-600">
                    {getDiscountDisplay()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    Usage
                  </span>
                  <span className="font-medium">
                    {voucher.currentUsage} / {voucher.maxUsage}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Per User Limit</span>
                  <span className="font-medium">{voucher.maxUsagePerUser}</span>
                </div>

                {/* Usage Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(voucher.currentUsage / voucher.maxUsage) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Validity Period */}
          <div className="mb-8">
            <h4 className="font-semibold text-gray-900 border-b pb-2 mb-4">Validity Period</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Valid From</p>
                  <p className="text-sm text-gray-700">{formatDate(voucher.validFrom)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-600 font-medium">Valid Till</p>
                  <p className="text-sm text-gray-700">{formatDate(voucher.validTill)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scope Information */}
          <div className="mb-8">
            <h4 className="font-semibold text-gray-900 border-b pb-2 mb-4">Scope</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Rate Scope</p>
                <p className="text-sm text-gray-600">{voucher.rateScope}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Room Scope</p>
                <p className="text-sm text-gray-600">{voucher.roomScope}</p>
              </div>
            </div>
          </div>

          {/* Associated Products */}
          {voucher.products && voucher.products.length > 0 && (
            <div className="mb-8">
              <h4 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Associated Products ({voucher.products.length})
              </h4>
              <div className="grid gap-4">
                {voucher.products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkMzMC42Mjc0IDMyIDM2IDI2LjYyNzQgMzYgMjBDMzYgMTMuMzcyNiAzMC42Mjc0IDggMjQgOEMxNy4zNzI2IDggMTIgMTMuMzcyNiAxMiAyMEMxMiAyNi42Mjc0IDE3LjM3MjYgMzIgMjQgMzJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik04IDU2QzggNDcuMTYzNCAxNS4xNjM0IDQwIDI0IDQwSDMyQzQwLjgzNjYgNDAgNDggNDcuMTYzNCA0OCA1NlY1Nkg4VjU2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 truncate">{product.name}</h5>
                      <p className="text-sm text-gray-500 truncate">{product.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-medium text-green-600">${product.value}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Metadata</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 text-gray-900">{formatDate(voucher.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <span className="ml-2 text-gray-900">{formatDate(voucher.updatedAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Voucher ID:</span>
                <span className="ml-2 font-mono text-xs text-gray-700">{voucher.id}</span>
              </div>
              {voucher.createdBy && (
                <div>
                  <span className="text-gray-600">Created By:</span>
                  <span className="ml-2 text-gray-900">{voucher.createdBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}