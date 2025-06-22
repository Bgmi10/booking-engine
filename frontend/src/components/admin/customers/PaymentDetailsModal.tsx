export default function PaymentDetailsModal({ payment, onClose }: { payment: any, onClose: () => void }) {
  if (!payment) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        <h3 className="text-xl font-bold mb-4">Payment Details</h3>
        <div className="text-gray-700">Coming soon...</div>
      </div>
    </div>
  );
} 