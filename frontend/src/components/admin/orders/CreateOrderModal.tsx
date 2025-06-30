import { useState } from 'react';
import ProductSelectionStep from './ProductSelectionStep';
import CustomerStep from './CustomerStep';
import PaymentStep from './PaymentStep';
import SummaryStep from './SummaryStep';
import { BsArrowLeft, BsArrowRight } from 'react-icons/bs';
import toast from 'react-hot-toast';
import type { Customer } from '../../../hooks/useCustomers';
import { baseUrl } from '../../../utils/constants';

type Step = 'products' | 'customer' | 'payment' | 'summary';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  role: string;
}

export default function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState<Step>('products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [temporaryGuestName, setTemporaryGuestName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER' | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    const orderData = {
      items: cart,
      paymentMethod,
      customerId: selectedCustomer?.id,
      temporaryCustomerSurname: selectedCustomer ? undefined : temporaryGuestName,
      locationName: 'pool', // This should be dynamic in a real app
    };

    try {
      const response = await fetch(`${baseUrl}/admin/orders/create`, {
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order');
      }
      toast.success('Order placed successfully!');
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'products':
        if (cart.length > 0) setCurrentStep('customer');
        break;
      case 'customer':
        if (selectedCustomer || temporaryGuestName) setCurrentStep('payment');
        break;
      case 'payment':
        if (paymentMethod) setCurrentStep('summary');
        break;
      case 'summary':
        handlePlaceOrder();
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'customer':
        setCurrentStep('products');
        break;
      case 'payment':
        setCurrentStep('customer');
        break;
      case 'summary':
        setCurrentStep('payment');
        break;
      default:
        break;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'products':
        return <ProductSelectionStep cart={cart} setCart={setCart} />;
      case 'customer':
        return <CustomerStep
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          temporaryGuestName={temporaryGuestName}
          setTemporaryGuestName={setTemporaryGuestName}
          onNext={handleNext}
        />;
      case 'payment':
        return <PaymentStep
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          onNext={handleNext}
        />;
      case 'summary':
        return <SummaryStep
          cart={cart}
          customer={selectedCustomer}
          guestName={temporaryGuestName}
          paymentMethod={paymentMethod}
        />;
      default:
        return null;
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] relative animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200/80 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create New Order</h2>
            <p className="text-sm text-gray-500 capitalize">Step: {currentStep}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Total</p>
            <p className="text-2xl font-bold text-blue-600">€{total.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
          {renderStep()}
        </div>
        <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={currentStep === 'products'}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BsArrowLeft />
              Back
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 'products' && cart.length === 0) ||
                (currentStep === 'customer' && !selectedCustomer && !temporaryGuestName) ||
                (currentStep === 'payment' && !paymentMethod) ||
                isPlacingOrder
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacingOrder ? 'Placing...' : (currentStep === 'summary' ? 'Place Order' : 'Next')}
              {currentStep !== 'summary' && <BsArrowRight />}
            </button>
        </div>
      </div>
    </div>
  );
} 