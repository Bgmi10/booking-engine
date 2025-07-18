import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../utils/constants';
import type { PaymentPlanStage } from '../../types/types';

const PaymentConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const stageId = searchParams.get('stageId');
  
  const [loading, setLoading] = useState(true);
  const [paymentStage, setPaymentStage] = useState<PaymentPlanStage | null>(null);
  const [proposalName, setProposalName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentStage = async () => {
      if (!stageId) {
        setError('No payment stage ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching payment stage:', stageId);
        const response = await fetch(`${baseUrl}/payment-plans/client/payment-stages/${stageId}`, {
          method: 'GET'
          // No credentials needed for client-facing routes
        });
        
        const data = await response.json();
        console.log('Payment stage API response:', data);
        
        if (response.ok && data.success && data.data) {
          console.log('Payment stage fetched successfully:', data.data);
          
          // Check if the response has the expected structure
          if (data.data.paymentPlan && data.data.paymentPlan.proposal) {
            setPaymentStage(data.data);
            setProposalName(data.data.paymentPlan.proposal.name);
          } else {
            console.error('Invalid payment stage data structure:', data.data);
            setError('Invalid payment information received');
            toast.error('Invalid payment information received');
          }
        } else {
          console.error('Failed to load payment information:', data);
          setError(data.message || 'Failed to load payment information');
          toast.error(data.message || 'Failed to load payment information');
        }
      } catch (error) {
        console.error('Error fetching payment stage:', error);
        setError('Error loading payment information');
        toast.error('Error loading payment information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentStage();
  }, [stageId]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading payment information...</h2>
        </div>
      </div>
    );
  }

  if (error || !paymentStage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold">Payment Not Found</h2>
            <p className="mt-2">{error || 'The payment information you\'re looking for could not be found.'}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const getStatusContent = () => {
    switch (paymentStage.status) {
      case 'PAID':
        return {
          title: 'Payment Successful!',
          description: 'Thank you for your payment. Your payment has been processed successfully.',
          icon: '✅',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700'
        };
        
      case 'PROCESSING':
        return {
          title: 'Payment Processing',
          description: 'Your payment is currently being processed. This may take a few moments.',
          icon: '⏳',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700'
        };
        
      case 'PENDING':
        return {
          title: 'Payment Pending',
          description: 'Your payment has not been completed yet.',
          icon: '⏳',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700'
        };
        
      case 'OVERDUE':
        return {
          title: 'Payment Overdue',
          description: 'This payment is overdue. Please complete it as soon as possible.',
          icon: '⚠️',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700'
        };
        
      default:
        return {
          title: 'Payment Status',
          description: 'Thank you for your interest in our wedding services.',
          icon: 'ℹ️',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700'
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <div className={`${statusContent.bgColor} ${statusContent.textColor} p-6 rounded-lg text-center mb-6`}>
          <div className="text-4xl mb-2">{statusContent.icon}</div>
          <h2 className="text-2xl font-bold">{statusContent.title}</h2>
          <p className="mt-2">{statusContent.description}</p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Proposal:</span>
              <span className="font-medium">{proposalName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Description:</span>
              <span className="font-medium">{paymentStage.description}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">€{paymentStage.amount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium">{formatDate(paymentStage.dueDate)}</span>
            </div>
            
            {paymentStage.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Paid On:</span>
                <span className="font-medium">{formatDate(paymentStage.paidAt)}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center">
          {paymentStage.status === 'PROCESSING' ? (
            <p className="text-sm text-gray-500">
              Your payment is being processed. You'll receive a confirmation once completed.
            </p>
          ) : paymentStage.status === 'PAID' ? (
            <p className="text-sm text-gray-500">
              Thank you for your payment! A receipt has been sent to your email.
            </p>
          ) : (
            paymentStage.stripePaymentUrl && (
              <a
                href={paymentStage.stripePaymentUrl}
                className="block w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Complete Payment
              </a>
            )
          )}
          
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 text-blue-600 rounded-md hover:text-blue-800"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation; 