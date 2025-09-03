import { useState } from 'react';
import { LogIn, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';

interface ManualCheckInButtonProps {
  type: 'booking' | 'paymentIntent' | 'bookingGroup';
  id: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onSuccess?: (result: any) => void;
}

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 mr-1 text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
  </svg>
);

export default function ManualCheckInButton({
  type,
  id,
  label,
  disabled = false,
  className = "",
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  onSuccess
}: ManualCheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Determine the endpoint based on type
  const getEndpoint = () => {
    switch (type) {
      case 'booking':
        return `${baseUrl}/admin/bookings/${id}/send-checkin`;
      case 'paymentIntent':
        return `${baseUrl}/admin/payment-intents/${id}/send-checkin`;
      case 'bookingGroup':
        return `${baseUrl}/admin/booking-groups/${id}/send-checkin`;
      default:
        throw new Error('Invalid check-in type');
    }
  };

  // Determine the default label based on type
  const getDefaultLabel = () => {
    switch (type) {
      case 'booking':
        return 'Send Check-In';
      case 'paymentIntent':
        return 'Send Check-In';
      case 'bookingGroup':
        return 'Send Group Check-In';
      default:
        return 'Send Check-In';
    }
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700';
      case 'secondary':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700';
      case 'outline':
      default:
        return 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400';
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const handleSendCheckIn = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(getEndpoint(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send check-in invitation');
      }

      // Show success message
      const successMessage = getSuccessMessage(data);
      toast.success(successMessage);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data.data || data);
      }

    } catch (error: any) {
      console.error('Error sending manual check-in:', error);
      toast.error(error.message || 'Failed to send check-in invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const getSuccessMessage = (data: any) => {
    switch (type) {
      case 'booking':
        return 'Check-in invitation sent successfully!';
      case 'paymentIntent':
        const resultCount = data.data?.length || 1;
        return `Check-in invitation sent for ${resultCount} check-in date(s)!`;
      case 'bookingGroup':
        const successCount = data.data?.successfulInvitations || 1;
        const totalProcessed = data.data?.totalProcessed || 1;
        return `Check-in invitations sent: ${successCount}/${totalProcessed} successful!`;
      default:
        return 'Check-in invitation sent successfully!';
    }
  };

  const displayLabel = label || getDefaultLabel();
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <button
      onClick={handleSendCheckIn}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center
        border rounded-md font-medium
        transition-all duration-200
        ${variantStyles}
        ${sizeStyles}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={`Send manual check-in invitation for this ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        showIcon && (
          <LogIn className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} ${displayLabel ? 'mr-1' : ''}`} />
        )
      )}
      {isLoading ? 'Sending...' : displayLabel}
    </button>
  );
}

// Export a convenience hook for checking if check-in should be available
export const useCheckInAvailability = (status: string, checkInDate?: string) => {
  // Only show check-in for confirmed bookings
  const isConfirmed = status === 'CONFIRMED' || status === 'SUCCEEDED';
  
  // Check if check-in date is in the future or today
  let isUpcoming = true;
  if (checkInDate) {
    const checkIn = new Date(checkInDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    isUpcoming = checkIn >= today;
  }
  
  return {
    isAvailable: isConfirmed && isUpcoming,
    isConfirmed,
    isUpcoming
  };
};