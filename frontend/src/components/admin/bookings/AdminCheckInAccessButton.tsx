import { useState } from 'react';
import { ExternalLink, Loader2, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';

type AccessType = 'paymentIntent' | 'bookingGroup';

interface AdminCheckInAccessButtonProps {
  type: AccessType;
  id: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export default function AdminCheckInAccessButton({
  type,
  id,
  disabled = false,
  variant = 'secondary',
  size = 'sm',
  label,
  className = ''
}: AdminCheckInAccessButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccessCheckIn = async () => {
    if (!id) {
      toast.error('Invalid ID provided');
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = type === 'paymentIntent' 
        ? `/admin/payment-intents/${id}/checkin-url`
        : `/admin/booking-groups/${id}/checkin-url`;

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.data?.checkinUrl) {
        // Open check-in portal in new tab
        window.open(data.data.checkinUrl, '_blank');
        toast.success('Check-in portal opened in new tab');
      } else {
        toast.error(data.message || 'Failed to get check-in URL');
      }
    } catch (error) {
      console.error('Error accessing check-in portal:', error);
      toast.error('Failed to access check-in portal');
    } finally {
      setIsLoading(false);
    }
  };

  // Button styling based on variant and size
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const defaultLabel = type === 'bookingGroup' 
    ? 'Access Group Check-In'
    : 'Access Check-In';

  return (
    <button
      onClick={handleAccessCheckIn}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      title="Access customer check-in portal as admin"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserCheck className="h-4 w-4" />
      )}
      <span className="ml-1.5">
        {label || defaultLabel}
      </span>
      <ExternalLink className="h-3 w-3 ml-1" />
    </button>
  );
}

// Hook to check if admin check-in access should be available
export function useAdminCheckInAccess(status: string) {
  // Admin can access check-in for confirmed bookings
  const isAvailable = status === 'CONFIRMED' || status === 'SUCCEEDED';
  
  return {
    isAvailable
  };
}