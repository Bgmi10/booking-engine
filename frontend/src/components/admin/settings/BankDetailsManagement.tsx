import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Check, X, CreditCard, Building2 } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import type { BankDetails } from '../../../types/types';

interface BankDetailsForm {
  name: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  routingNumber: string;
}

export default function BankDetailsManagement() {
  const [bankDetails, setBankDetails] = useState<BankDetails[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BankDetailsForm>({
    name: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    routingNumber: ''
  });

  const fetchBankDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/bank-details/all`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setBankDetails(data.data);
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.name || !formData.bankName || !formData.accountName || !formData.accountNumber) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const url = editingId 
        ? `${baseUrl}/admin/bank-details/${editingId}`
        : `${baseUrl}/admin/bank-details`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        resetForm();
        fetchBankDetails();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save bank details');
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      alert('Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bank: BankDetails) => {
    setEditingId(bank.id);
    setFormData({
      name: bank.name,
      bankName: bank.bankName,
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      iban: bank.iban || '',
      swiftCode: bank.swiftCode || '',
      routingNumber: bank.routingNumber || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/bank-details/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchBankDetails();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete bank details');
      }
    } catch (error) {
      console.error('Error deleting bank details:', error);
      alert('Failed to delete bank details');
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const bank = bankDetails.find(b => b.id === id);
      if (!bank) return;

      const response = await fetch(`${baseUrl}/admin/bank-details/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bank,
          isActive: !currentStatus
        }),
      });

      if (response.ok) {
        fetchBankDetails();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update bank details');
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      alert('Failed to update bank details');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      iban: '',
      swiftCode: '',
      routingNumber: ''
    });
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="text-gray-600">Manage bank accounts for payment transfers</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Bank Account
        </button>
      </div>

      {/* Bank Accounts List */}
      {loading && bankDetails.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : bankDetails.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a bank account.</p>
          <div className="mt-6">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Bank Account
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {bankDetails.map((bank) => (
            <div
              key={bank.id}
              className={`bg-white rounded-xl border-2 p-6 transition-all ${
                bank.isActive 
                  ? 'border-green-200 bg-green-50/30' 
                  : 'border-gray-200 bg-gray-50/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      bank.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{bank.name}</h3>
                      <p className="text-sm text-gray-600">{bank.bankName}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bank.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {bank.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Account Holder</p>
                      <p className="font-medium text-gray-900">{bank.accountName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Account Number</p>
                      <p className="font-mono font-medium text-gray-900">{bank.accountNumber}</p>
                    </div>
                    {bank.iban && (
                      <div>
                        <p className="text-gray-500">IBAN</p>
                        <p className="font-mono font-medium text-gray-900">{bank.iban}</p>
                      </div>
                    )}
                    {bank.swiftCode && (
                      <div>
                        <p className="text-gray-500">SWIFT/BIC</p>
                        <p className="font-mono font-medium text-gray-900">{bank.swiftCode}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleActiveStatus(bank.id, bank.isActive)}
                    disabled={loading}
                    className={`p-2 rounded-lg transition-colors ${
                      bank.isActive
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={bank.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {bank.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleEdit(bank)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(bank.id)}
                    disabled={loading}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={closeModal}
        >
          <div 
            className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200/80">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Bank Account' : 'Add Bank Account'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Main Business Account"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bank of Italy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., La Torre SRL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., IT60 X054 2811 1010 0000 0123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SWIFT/BIC Code
                </label>
                <input
                  type="text"
                  value={formData.swiftCode}
                  onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., BITAITRR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={formData.routingNumber}
                  onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., 021000021 (US banks)"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50/80 border-t border-gray-200/80 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 