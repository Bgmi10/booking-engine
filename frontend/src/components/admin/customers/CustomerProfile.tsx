import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, CreditCard, Car, Trash2, Plus, Link2, UserPlus } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestMiddleName?: string;
  guestEmail: string;
  guestPhone?: string;
  guestNationality?: string;
  dob?: string;
  city?: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportIssuedCountry?: string;
  carNumberPlate?: string;
  vipStatus?: boolean;
  totalNightStayed?: number;
  totalMoneySpent?: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RelatedGuest {
  id: string;
  relationshipType: string;
  canBookFor: boolean;
  relatedCustomer: Customer;
  createdAt: string;
}

export const CustomerProfile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const customerId = searchParams.get('customerid');
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [relatedGuests, setRelatedGuests] = useState<RelatedGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchRelatedGuests();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customerId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomer(data.data);
        setAdminNotes(data.data.adminNotes || '');
      } else {
        toast.error('Failed to fetch customer details');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedGuests = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customerId}/relationships`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setRelatedGuests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customerId}/notes`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminNotes }),
      });

      if (response.ok) {
        toast.success('Notes saved successfully');
        setIsEditingNotes(false);
        if (customer) {
          setCustomer({ ...customer, adminNotes });
        }
      } else {
        toast.error('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRemoveRelationship = async (relatedCustomerId: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customerId}/relationships/${relatedCustomerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Relationship removed successfully');
        setRelatedGuests(prev => prev.filter(r => r.relatedCustomer.id !== relatedCustomerId));
      } else {
        toast.error('Failed to remove relationship');
      }
    } catch (error) {
      console.error('Error removing relationship:', error);
      toast.error('Failed to remove relationship');
    }
  };

  const formatRelationshipType = (type: string) => {
    return type.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Customer not found</p>
          <button
            onClick={() => navigate('/admin/dashboard?sidebar=customers')}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.guestFirstName} {customer.guestMiddleName} {customer.guestLastName}
              </h1>
              {customer.vipStatus && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  VIP Customer
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium">{customer.guestEmail}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium">{customer.guestPhone || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">City</p>
                  <p className="text-sm font-medium">{customer.city || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="text-sm font-medium">{formatDate(customer.dob)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Document Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Passport Number</p>
                  <p className="text-sm font-medium">{customer.passportNumber || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500">Passport Expiry</p>
                <p className="text-sm font-medium">{formatDate(customer.passportExpiry)}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500">Issued Country</p>
                <p className="text-sm font-medium">{customer.passportIssuedCountry || 'N/A'}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Car License Plate</p>
                  <p className="text-sm font-medium">{customer.carNumberPlate || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Admin Notes</h2>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-4">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Add notes about this customer (not visible to customer)..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setAdminNotes(customer.adminNotes || '');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {customer.adminNotes || 'No notes added yet'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Stats & Relationships */}
        <div className="space-y-6">
          {/* Customer Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Statistics</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Total Nights Stayed</p>
                <p className="text-2xl font-bold text-gray-900">{customer.totalNightStayed || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Money Spent</p>
                <p className="text-2xl font-bold text-gray-900">€{customer.totalMoneySpent?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Member Since</p>
                <p className="text-sm font-medium">{formatDate(customer.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Relationships */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Relationships</h2>
              <Link2 className="w-5 h-5 text-gray-400" />
            </div>
            
            {relatedGuests.length === 0 ? (
              <p className="text-gray-500 text-sm">No relationships added</p>
            ) : (
              <div className="space-y-3">
                {relatedGuests.map((relation) => (
                  <div
                    key={relation.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => navigate(`/admin/dashboard?sidebar=customers&customerid=${relation.relatedCustomer.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {relation.relatedCustomer.guestFirstName} {relation.relatedCustomer.guestLastName}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatRelationshipType(relation.relationshipType)}
                          </span>
                          {relation.canBookFor && (
                            <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                              Can book
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRelationship(relation.relatedCustomer.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Remove relationship"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};