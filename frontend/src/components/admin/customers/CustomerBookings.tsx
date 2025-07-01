import { useEffect, useState, useMemo } from "react";
import { baseUrl } from "../../../utils/constants";
import { generateMergedBookingId, getStatusColor } from "../../../utils/helper";
import VoucherModal from "./VoucherModal";
import BookingDetailsModal from "./BookingDetailsModal";
import PaymentDetailsModal from "./PaymentDetailsModal";

interface CustomerBookingsProps {
  customer: any;
  onClose: () => void;
}

export default function CustomerBookings({ customer, onClose }: CustomerBookingsProps) {
  const [paymentIntents, setPaymentIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [voucherModal, setVoucherModal] = useState<{ open: boolean; voucher: any | null }>({ open: false, voucher: null });
  const [bookingDetailsModal, setBookingDetailsModal] = useState<{ open: boolean; details: any[] | null; status?: string }>({ open: false, details: null, status: undefined });
  const [paymentDetailsModal, setPaymentDetailsModal] = useState<{ open: boolean; details: any | null }>({ open: false, details: null });

  useEffect(() => {
    setLoading(true);
    fetch(baseUrl + `/admin/customers/${customer.id}/bookings`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setPaymentIntents(data.data?.paymentIntents || []))
      .catch(() => setPaymentIntents([]))
      .finally(() => setLoading(false));
  }, [customer.id]);

  const filtered = useMemo(() => {
    if (!search) return paymentIntents;
    return paymentIntents.filter(pi => {
      const ids = (pi.bookings || []).map((b: any) => b.id);
      return generateMergedBookingId(ids).toLowerCase().includes(search.toLowerCase());
    });
  }, [paymentIntents, search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this payment intent?")) return;
    await fetch(baseUrl + `/admin/payment-intent/${id}/delete`, { method: "DELETE", credentials: "include" });
    setPaymentIntents((prev) => prev.filter(pi => pi.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        <h2 className="text-2xl font-bold mb-4">
          Bookings History for {customer.guestFirstName} {customer.guestLastName}
        </h2>
        <input
          type="text"
          placeholder="Search by Booking ID"
          className="border rounded px-3 py-2 w-80 mb-4"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">No bookings found.</div>
        ) : (
          filtered.map((pi) => {
            //@ts-ignore
            let customerData = {};
            let bookingDataArr = [];
            try { customerData = JSON.parse(pi.customerData); } catch {}
            try {
              const rawArr = JSON.parse(pi.bookingData);
              bookingDataArr = rawArr.map((booking: any) => {
                const found = (pi.bookings || []).find((b: any) => b.id === booking.id);
                return { ...booking, status: found?.status || '-' };
              });
            } catch {}
            const bookingIds = (pi.bookings || []).map((b: any) => b.id);
            const confirmationId = generateMergedBookingId(bookingIds);
            return (
              <div key={pi.id} className="border rounded-lg p-4 mb-6 shadow bg-gray-50">
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <div>
                    <span className="font-mono font-bold text-lg">Confirmation ID: {confirmationId}</span>
                    <span className={`ml-4 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(pi.status)}`}>{pi.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => handleDelete(pi.id)}>Delete</button>
                   {pi.voucherUsages.length > 0  && <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => setVoucherModal({ open: true, voucher: pi.voucherUsages })}>View Voucher</button>}
                    <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={() => setBookingDetailsModal({ open: true, details: bookingDataArr, status: pi.status })}>Booking Details</button>
                    <button className="px-3 py-1 bg-gray-500 text-white rounded" onClick={() => setPaymentDetailsModal({ open: true, details: pi })}>Payment Details</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <div className="font-semibold mt-2">Created At:</div>
                    <div>{pi.createdAt ? new Date(pi.createdAt).toLocaleString() : "-"}</div>
                    <div className="font-semibold mt-2">Paid At:</div>
                    <div>{pi.paidAt ? new Date(pi.paidAt).toLocaleString() : "-"}</div>
                    <div className="font-semibold mt-2">Currency:</div>
                    <div>{pi.currency?.toUpperCase() || "-"}</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="font-semibold flex">Amount: <div>{pi.amount}</div></div>
                    
                    <div className="font-semibold mt-2 d flex">Tax Amount:  <div>{pi.taxAmount}</div></div>
                   
                    {pi.voucherDiscount && <div className="font-semibold mt-2 d flex">Voucher Discount:  <div>{pi.voucherDiscount}</div> </div>}
                   
                    <div className="font-semibold mt-2 d flex">Final Amount:  <div>{pi.totalAmount}</div></div>
                   
                  </div>
                </div>
              </div>
            );
          })
        )}
        {voucherModal.open && (
          <VoucherModal voucherId={voucherModal.voucher?.[0]?.voucherId} onClose={() => setVoucherModal({ open: false, voucher: null })} />
        )}
        {bookingDetailsModal.open && (
          <BookingDetailsModal status={bookingDetailsModal.status || "-"} bookingData={bookingDetailsModal.details || []} onClose={() => setBookingDetailsModal({ open: false, details: null, status: undefined })} />
        )}
        {paymentDetailsModal.open && (
          <PaymentDetailsModal payment={paymentDetailsModal.details} onClose={() => setPaymentDetailsModal({ open: false, details: null })} />
        )}
      </div>
    </div>
  );
} 