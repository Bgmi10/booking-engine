import { 
  Calendar, 
  Users, 
  Home, 
  DollarSign, 
  Tag, 
  Star, 
  Clock, 
  CheckCircle, 
  X,
  Bed,
  Coffee,
  Wifi,
  Car,
  ImageIcon
} from "lucide-react";
import { calculateNights } from "../../../utils/format";
import type { BookingData} from "../../../types/types";

export default function BookingDetailsModal({ 
  status,
  bookingData, 
  onClose 
}: {
  status: string;
  bookingData: BookingData[]; 
  onClose: () => void;
}) {
  if (!bookingData || bookingData.length === 0) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return <Wifi className="h-4 w-4" />;
    if (amenityLower.includes('coffee') || amenityLower.includes('breakfast')) return <Coffee className="h-4 w-4" />;
    if (amenityLower.includes('parking') || amenityLower.includes('car')) return <Car className="h-4 w-4" />;
    return <Star className="h-4 w-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Bed className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Booking Details {bookingData.length > 1 && `(${bookingData.length} Reservations)`}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {bookingData.map((booking, idx) => (
            <div key={booking.id} className="mb-8 last:mb-0">
              {/* Booking Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {status}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Dates */}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Stay Duration</p>
                      <p className="font-medium">{calculateNights(booking.checkIn, booking.checkOut)} nights</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </p>
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Guests & Rooms</p>
                      <p className="font-medium">{booking.adults} Adults, {booking.rooms} Room{booking.rooms > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="font-bold text-lg text-green-600">${booking.totalPrice}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Details */}
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                {/* Room Information */}
                <div className="bg-white border rounded-lg p-6">
                  <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Room Details
                  </h5>

                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-lg">{booking.roomDetails.name}</p>
                      <p className="text-gray-600 text-sm">{booking.roomDetails.description}</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        Max {booking.roomDetails.capacity} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {booking.roomDetails.minimumStay} night min
                      </span>
                    </div>

                    <div className="pt-2">
                      <p className="font-medium text-sm mb-2">Base Rate: ${booking.roomDetails.price}/night</p>
                    </div>
                  </div>

                  {/* Room Images */}
                  {booking.roomDetails.images && booking.roomDetails.images.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Room Images</p>
                      <div className="grid grid-cols-3 gap-2">
                        {booking.roomDetails.images.slice(0, 6).map((img, i) => (
                          <div key={img.id} className="relative group">
                            <img 
                              src={img.url} 
                              alt={`${booking.roomDetails.name} - Image ${i + 1}`}
                              className="w-full h-20 object-cover rounded-lg transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rate & Booking Info */}
                <div className="space-y-4">
                  {/* Selected Rate */}
                  <div className="bg-white border rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Rate Plan
                    </h5>

                    <div className="space-y-3">
                      <div>
                        <p className="font-medium">{booking.selectedRateOption.name}</p>
                        <p className="text-sm text-gray-600">{booking.selectedRateOption.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Rate per night</span>
                        <span className="font-semibold">${booking.selectedRateOption.price}</span>
                      </div>

                      {booking.selectedRateOption.discountPercentage > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Discount</span>
                          <span className="text-green-600 font-medium">
                            -{booking.selectedRateOption.discountPercentage}%
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <CheckCircle className={`h-4 w-4 ${booking.selectedRateOption.refundable ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${booking.selectedRateOption.refundable ? 'text-green-600' : 'text-gray-500'}`}>
                          {booking.selectedRateOption.refundable ? 'Refundable' : 'Non-refundable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Check-in/out Times */}
                  <div className="bg-white border rounded-lg p-6">
                    <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Check-in & Check-out
                    </h5>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Check-in</span>
                        <span className="font-medium">{formatDateTime(booking.checkIn)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Check-out</span>
                        <span className="font-medium">{formatDateTime(booking.checkOut)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {booking.roomDetails.amenities && booking.roomDetails.amenities.length > 0 && (
                <div className="bg-white border rounded-lg p-6 mb-6">
                  <h5 className="font-semibold text-gray-900 mb-4">Room Amenities</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {booking.roomDetails.amenities.map((amenity, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        {getAmenityIcon(amenity)}
                        <span className="text-sm text-gray-700 capitalize">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhancements */}
              {booking.selectedEnhancements && booking.selectedEnhancements.length > 0 && (
                <div className="bg-white border rounded-lg p-6 mb-6">
                  <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Selected Enhancements
                  </h5>
                  <div className="space-y-4">
                    {booking.selectedEnhancements.map((enhancement, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {enhancement.title || enhancement.name}
                          </p>
                          {enhancement.notes && (
                            <p className="text-sm text-gray-600 mt-1">{enhancement.notes}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            Pricing: {enhancement.pricingType}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-700">${enhancement.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Promotion & Requests */}
                <div className="bg-white border rounded-lg p-6">
                  <h5 className="font-semibold text-gray-900 mb-4">Additional Details</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Promotion Code</span>
                      <span className={`${booking.promotionCode ? 'bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-sm' : 'text-gray-400 italic'}`}>
                        {booking.promotionCode || 'None applied'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Special Requests</span>
                      <p className={`mt-1 ${booking.specialRequests ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {booking.specialRequests || 'No special requests'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Booking Metadata */}
                <div className="bg-white border rounded-lg p-6">
                  <h5 className="font-semibold text-gray-900 mb-4">Booking Information</h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booking ID</span>
                      <span className="font-mono text-xs">{booking.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Room ID</span>
                      <span className="font-mono text-xs">{booking.selectedRoom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rate Type</span>
                      <span className="capitalize">{booking.selectedRateOption.type}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator for multiple bookings */}
              {idx < bookingData.length - 1 && (
                <div className="border-t border-gray-200 mt-8 pt-8"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}