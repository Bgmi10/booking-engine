import React, { useState, useEffect } from 'react';
import { Link2, Trash2, User } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import toast from 'react-hot-toast';

// Main customer from parent component (uses guest* format)
interface MainCustomer {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestMiddleName?: string;
  guestEmail: string;
  guestPhone?: string;
}

// Related customer from relationships API (uses standard format)
interface RelatedCustomer {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  nationality?: string;
  dob?: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportIssuedCountry?: string;
  gender?: string;
  city?: string;
}

interface RelatedGuest {
  id: string;
  relationshipType: string;
  canBookFor: boolean;
  customer: RelatedCustomer;
  createdAt: string;
}

interface CustomerRelationshipManagerProps {
  customer: MainCustomer;
}

export const CustomerRelationshipManager: React.FC<CustomerRelationshipManagerProps> = ({ customer }) => {
  const [relatedGuests, setRelatedGuests] = useState<RelatedGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedGuests();
  }, [customer.id]);


  const fetchRelatedGuests = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customer.id}/relationships`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setRelatedGuests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
    } finally {
      setLoading(false)
    }
  };

  const handleRemoveRelationship = async (relatedCustomerId: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customer.id}/relationships/${relatedCustomerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Relationship removed successfully');
        setRelatedGuests(prev => prev.filter(r => r.customer.id !== relatedCustomerId));
      } else {
        toast.error('Failed to remove relationship');
      }
    } catch (error) {
      console.error('Error removing relationship:', error);
      toast.error('Failed to remove relationship');
    }
  };

  const handleViewRelatedCustomer = (relatedCustomerId: string) => {
    window.location.href = `/admin/dashboard?sidebar=customers&customerid=${relatedCustomerId}`;
  };

  const formatRelationshipType = (type: string) => {
    return type.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading relationships...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Info Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {customer.guestFirstName} {customer.guestMiddleName} {customer.guestLastName}
          </h2>
          <p className="text-sm text-gray-600">{customer.guestEmail}</p>
        </div>
      </div>

      {/* Relationships */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-b-gray-200 bg-gray-50">
          <Link2 className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Related Guests ({relatedGuests.length})</h3>
        </div>
        
        <div className="p-6">
          {relatedGuests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No relationships found for this customer</p>
          ) : (
            <div className="space-y-4">
              {relatedGuests.map((relation) => (
                <div
                  key={relation.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <button
                          onClick={() => handleViewRelatedCustomer(relation.customer.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {relation.customer.firstName} {relation.customer.lastName}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {formatRelationshipType(relation.relationshipType)}
                          </span>
                          {relation.canBookFor && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              Can make bookings
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Added: {new Date(relation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveRelationship(relation.customer.id)}
                    className="p-2 hover:bg-red-100 rounded-full transition-colors"
                    title="Remove relationship"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};