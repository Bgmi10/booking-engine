import React from "react"
import { X, Globe, MessageSquare, Phone, MapPin, ChevronRight, Shield, Calendar, AlertCircle, CreditCard, Percent } from "lucide-react"
import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import { useGeneralSettings } from "../../hooks/useGeneralSettings"

export const OnlineCheckInHome: React.FC = () => {
  const { customer, loader } = useOnlineCheckIn()
  const { settings } = useGeneralSettings()
  // Show loading state while fetching customer data
  if (loader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your check-in information...</p>
        </div>
      </div>
    )
  }

  // Show error state if customer data is not available
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load check-in information</p>
          <button
            onClick={() => window.location.href = "/"}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Extract data from context
  const guestData = customer.customer
  const bookings = customer.bookings || []
  // Get the earliest check-in date for main display
  const earliestBooking = bookings.length > 0 ? bookings.reduce((earliest, current) => {
    return new Date(current.checkIn) < new Date(earliest.checkIn) ? current : earliest
  }) : null


  const goToHome = () => {
    window.location.href = "/"
  }

  const handleCheckIn = () => {
    window.location.href = "/online-checkin"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Background Image */}
      {settings?.onlineCheckinHomeImageUrl && (
        <div className="fixed inset-0 z-0">
          <img
            src={settings.onlineCheckinHomeImageUrl}
            alt="La Torre"
            className="w-full h-[400px] object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div>
          
          {/* Brand logo/name overlay */}
          <div className="absolute bottom-4 left-6 flex items-center gap-3 text-white/80">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">LT</span>
            </div>
            <span className="text-sm font-medium">La Torre sulla via Francigena</span>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header */}
        <div className="absolute top-0 right-0 p-6 z-20">
          <button
            onClick={goToHome}
            className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 group"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="pt-20 pb-10">
          <div className="px-6">
            <h1 className="text-4xl font-normal text-white mb-2 pl-6">
              Welcome, {guestData.firstName}
            </h1>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            
            {/* Your Next Stay Section */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-1">Your next stay</p>
                <h2 className="text-xl font-semibold text-gray-900">La Torre sulla via Francigena</h2>
              </div>

              {/* Check-in/Check-out Dates */}
              {earliestBooking && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-gray-600 text-sm mb-1">Check-in</p>
                    <p className="font-medium text-gray-900">
                      {new Date(earliestBooking.checkIn).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-gray-600 text-sm mb-1">Check out</p>
                    <p className="font-medium text-gray-900">
                      {new Date(earliestBooking.checkOut).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Check in now Section */}
            <div className="bg-gray-900 text-white p-6">
              <h3 className="text-xl font-medium mb-2">Check in now</h3>
              <p className="text-gray-300 mb-6">Less time with documents and more time to enjoy your stay.</p>
              <button
                onClick={handleCheckIn}
                className="border border-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Check in
              </button>
            </div>

            {/* Bookings Section */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bookings</h3>
              
              {/* All bookings in a single flex container */}
              <div className="flex flex-wrap gap-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-2xl overflow-hidden shadow-sm w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)]">
                    {/* Room Image */}
                    <div className="h-40 bg-gray-200 flex items-center justify-center">
                      {booking.room.images && booking.room.images.length > 0 ? (
                        <img
                          src={booking.room.images[0].url}
                          alt={`${booking.room.name} view`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Booking Details */}
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 text-base mb-1">
                        {booking.room.name} (Max {booking.totalGuests} people)
                      </h4>
                      <p className="text-gray-500 text-sm">
                        {Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 3600 * 24))} nights
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule Section */}
              <div className="flex items-center justify-between mt-6">
                <h4 className="font-medium text-gray-900">Schedule</h4>
                <button className="text-blue-600 text-sm font-medium">Show more</button>
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact info</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => {
                      window.location.href = "https://www.latorre.farm/"
                    }}>
                  <div className="flex items-center gap-3" >
                    <Globe className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">Visit our website</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">Send us a message</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div 
                  onClick={() => window.open('tel:+393271192253')}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">+393271192253</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">79 via Santa Maria a Chianni</p>
                    <p className="text-gray-600">50050 Gambassi Terme, Italy</p>
                  </div>
                </div>
                
                {/* Google Maps iframe */}
                <div className="mt-4 h-32 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2893.180591324133!2d10.978541!3d43.529853!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x132a157f855b40db%3A0x54474c26d62ebf25!2sVia%20Santa%20Maria%20a%20Chianni%2C%2079%2C%2050050%20Gambassi%20Terme%20FI%2C%20Italy!5e0!3m2!1sen!2sus!4v1756797193726!5m2!1sen!2sus"
                    width="100%" 
                    height="128" 
                    style={{border: 0}} 
                    allowFullScreen 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                
                <button 
                  onClick={() => window.open('https://www.google.com/maps/dir//Via+Santa+Maria+a+Chianni,+79,+50050+Gambassi+Terme+FI,+Italy/@43.529853,10.978541,17z', '_blank')}
                  className="cursor-pointer w-full mt-3 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Get directions
                </button>
              </div>
            </div>

            {/* Cancellation Policy Section */}
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Details</h3>
              
              {bookings.map((booking) => {
                const ratePolicy = booking.room?.RoomRate?.[0]?.ratePolicy;
                
                if (!ratePolicy) {
                  return (
                    <div key={booking.id} className="bg-gray-50 rounded-xl p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">{booking.room.name}</h4>
                      <p className="text-gray-600 text-sm">Standard policy applies. Please contact us for more information.</p>
                    </div>
                  );
                }

                console.log(ratePolicy)

                // Calculate cancellation deadline based on policy
                const checkInDate = new Date(booking.checkIn);
                const getCancellationDeadline = () => {
                  const deadline = new Date(checkInDate);
                  
                  switch (ratePolicy.cancellationPolicy) {
                    case 'FLEXIBLE':
                      deadline.setDate(deadline.getDate() - 1); // 1 day before
                      break;
                    case 'MODERATE':
                      deadline.setDate(deadline.getDate() - 30); // 30 days before
                      break;
                    case 'STRICT':
                      deadline.setDate(deadline.getDate() - 60); // 60 days before
                      break;
                    case 'NON_REFUNDABLE':
                      return null; // No cancellation allowed
                    default:
                      deadline.setDate(deadline.getDate() - 7); // Default 7 days
                  }
                  
                  return deadline;
                };

                const cancellationDeadline = getCancellationDeadline();
                const isPastDeadline = cancellationDeadline && new Date() > cancellationDeadline;

                return (
                  <div key={booking.id} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                    {/* Room Header */}
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">{booking.room.name}</h4>
                      {ratePolicy.description && (
                        <p className="text-sm text-gray-600 mt-1">{ratePolicy.description}</p>
                      )}
                    </div>

                    {/* Payment Structure Cards */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Payment Structure</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-xl border-2 ${
                          booking.paymentStructure === "FULL_PAYMENT"
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 bg-white'
                        }`}>
                          <CreditCard className={`h-6 w-6 mx-auto mb-1 ${
                            booking.paymentStructure === "FULL_PAYMENT" ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <p className="text-xs font-semibold text-center text-gray-900">Full Payment</p>
                          <p className="text-xs text-center text-gray-600">100% paid</p>
                        </div>
                        <div className={`p-3 rounded-xl border-2 ${
                          booking.paymentStructure === 'SPLIT_PAYMENT' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 bg-white'
                        }`}>
                          <Percent className={`h-6 w-6 mx-auto mb-1 ${
                            booking.paymentStructure === 'SPLIT_PAYMENT' ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <p className="text-xs font-semibold text-center text-gray-900">Split Payment</p>
                          <p className="text-xs text-center text-gray-600">
                            {booking.prepayPercentage || 30}% paid
                          </p>
                        </div>
                      </div>
                      {booking.paymentStructure === 'SPLIT_PAYMENT' && (
                        <p className="text-xs text-gray-600 mt-2">
                          Remaining {100 - (ratePolicy.prepayPercentage || 30)}% due at check-in
                        </p>
                      )}
                    </div>

                    {/* Cancellation Policy Cards */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Cancellation Policy</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { 
                            key: 'FLEXIBLE', 
                            label: 'Flexible', 
                            desc: 'Cancel anytime', 
                            color: 'green',
                            bgColor: 'bg-green-50',
                            borderColor: 'border-green-500',
                            textColor: 'text-green-600',
                            icon: Shield 
                          },
                          { 
                            key: 'MODERATE', 
                            label: 'Moderate', 
                            desc: '30 days before', 
                            color: 'yellow',
                            bgColor: 'bg-yellow-50',
                            borderColor: 'border-yellow-500',
                            textColor: 'text-yellow-600',
                            icon: Calendar 
                          },
                          { 
                            key: 'STRICT', 
                            label: 'Strict', 
                            desc: 'Changes only', 
                            color: 'orange',
                            bgColor: 'bg-orange-50',
                            borderColor: 'border-orange-500',
                            textColor: 'text-orange-600',
                            icon: AlertCircle 
                          },
                          { 
                            key: 'NON_REFUNDABLE', 
                            label: 'Non-Refundable', 
                            desc: 'No changes', 
                            color: 'red',
                            bgColor: 'bg-red-50',
                            borderColor: 'border-red-500',
                            textColor: 'text-red-600',
                            icon: Shield 
                          }
                        ].map((policy) => {
                          const isActive = ratePolicy.cancellationPolicy === policy.key;
                          const IconComponent = policy.icon;
                          return (
                            <div
                              key={policy.key}
                              className={`p-2 rounded-lg border-2 ${
                                isActive
                                  ? `${policy.borderColor} ${policy.bgColor}`
                                  : 'border-gray-200 bg-gray-50 opacity-50'
                              }`}
                            >
                              <IconComponent className={`h-5 w-5 mx-auto mb-1 ${
                                isActive ? policy.textColor : 'text-gray-400'
                              }`} />
                              <p className={`text-xs font-semibold text-center ${
                                isActive ? 'text-gray-900' : 'text-gray-400'
                              }`}>
                                {policy.label}
                              </p>
                              <p className={`text-xs text-center ${
                                isActive ? 'text-gray-600' : 'text-gray-400'
                              }`}>
                                {policy.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cancellation Deadline Info */}
                    {cancellationDeadline && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          {isPastDeadline ? '⚠️ Cancellation deadline has passed' : '✓ Free cancellation until'}
                        </p>
                        <p className={`text-sm font-semibold ${isPastDeadline ? 'text-red-600' : 'text-gray-900'}`}>
                          {cancellationDeadline.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* Additional Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* Refundable Status */}
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-600">Refundable</p>
                        <p className={`font-semibold ${ratePolicy.refundable ? 'text-green-600' : 'text-gray-500'}`}>
                          {ratePolicy.refundable ? '✓ Yes' : '✗ No'}
                        </p>
                      </div>

                      {/* Changes Allowed */}
                      {ratePolicy.changeAllowedDays && (
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600">Changes allowed</p>
                          <p className="font-semibold text-gray-900">
                            {ratePolicy.changeAllowedDays} days before
                          </p>
                        </div>
                      )}

                      {/* Full Payment Due */}
                      {ratePolicy.fullPaymentDays && ratePolicy.paymentStructure === 'SPLIT_PAYMENT' && (
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600">Full payment due</p>
                          <p className="font-semibold text-gray-900">
                            {ratePolicy.fullPaymentDays} days before
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Contact Support Card */}
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Need assistance?</p>
                    <p className="text-sm text-gray-700 mb-3">
                      Our team is here to help with any changes or questions about your reservation.
                    </p>
                    <button 
                      onClick={() => window.open('tel:+393271192253')}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Call +39 327 119 2253
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}

