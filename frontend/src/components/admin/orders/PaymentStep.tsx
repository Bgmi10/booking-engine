import { FaHome, FaCreditCard } from 'react-icons/fa';

interface PaymentStepProps {
  onNext: () => void;
  paymentMethod: 'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER' | null;
  setPaymentMethod: (method: 'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER') => void;
}

export default function PaymentStep({ onNext, paymentMethod, setPaymentMethod }: PaymentStepProps) {

  const handleSelect = (method: 'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER') => {
    setPaymentMethod(method);
    onNext();
  };

  return (
    <div className="max-w-xl mx-auto text-center">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Choose Payment Method</h3>
      <p className="text-gray-500 mb-8">How will the customer be paying for this order?</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assign to Room */}
        <div
          onClick={() => handleSelect('ASSIGN_TO_ROOM')}
          className={`p-8 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'ASSIGN_TO_ROOM'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-400'
          }`}
        >
          <FaHome className="w-16 h-16 mx-auto text-blue-600" />
          <h4 className="text-xl font-semibold mt-4 text-gray-900">Assign to Room</h4>
          <p className="text-sm text-gray-600 mt-1">Charge the order to the customer's room bill.</p>
        </div>

        {/* Pay at Waiter */}
        <div
          onClick={() => handleSelect('PAY_AT_WAITER')}
          className={`p-8 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'PAY_AT_WAITER'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-400'
          }`}
        >
          <FaCreditCard className="w-16 h-16 mx-auto text-blue-600" />
          <h4 className="text-xl font-semibold mt-4 text-gray-900">Pay at Waiter</h4>
          <p className="text-sm text-gray-600 mt-1">The waiter will collect payment upon delivery.</p>
        </div>
      </div>
    </div>
  );
} 