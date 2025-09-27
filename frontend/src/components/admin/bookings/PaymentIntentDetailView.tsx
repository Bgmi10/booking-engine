import { CreditCard, DollarSign, Mail, MapPin, RefreshCw, Trash, Users, Settings, FileText, Calendar, ChevronDown, ChevronUp, Plus, ShoppingBag } from "lucide-react"
import CheckInCheckOutButtons from './CheckInCheckOutButtons';
import type { BookingData, PaymentIntentDetailsViewProps } from "../../../types/types"
import { differenceInDays, format } from "date-fns"
import { getStatusColor } from "../../../utils/helper"
import { baseUrl } from "../../../utils/constants"
import CustomPartialRefundModal from "./CustomPartialRefundModal"
import BookingOverviewModal from "./BookingOverviewModal"
import TaxOptimizationModal from "../invoices/TaxOptimizationModal"
import BookingEventsModal from "./BookingEventsModal"
import OrderDetailsModal from "../customers/OrderDetailsModal"
import ChargeModal from "../customers/ChargeModal"
import ManageAttendeesModal from "./ManageAttendeesModal"
import { useState, useEffect } from "react"

  export default function PaymentIntentDetailsView({
    paymentIntent,
    paymentDetails,
    onDelete,
    onSendInvoice,
    onRestore,
    onRefund,
    onRefresh,
    loadingAction,
    isDeletedTab = false,
    hideInvoiceButtons = false,
  }: PaymentIntentDetailsViewProps) {
    const [showCustomPartialRefundModal, setShowCustomPartialRefundModal] = useState(false);
    const [showBookingOverviewModal, setShowBookingOverviewModal] = useState(false);
    const [showTaxModal, setShowTaxModal] = useState(false);
    const [showEventsManagementModal, setShowEventsManagementModal] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [isPaymentsAccordionOpen, setIsPaymentsAccordionOpen] = useState(true);
    const [isOrdersAccordionOpen, setIsOrdersAccordionOpen] = useState(true);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [isEventsAccordionOpen, setIsEventsAccordionOpen] = useState(true);
    const [showManageAttendeesModal, setShowManageAttendeesModal] = useState(false);
    const [selectedEventGuestRegistryId, setSelectedEventGuestRegistryId] = useState<string | null>(null);

    // Fetch general settings to check if tax optimization is enabled
    console.log(paymentIntent)
    useEffect(() => {
      const fetchSettings = async () => {
        try {
          const response = await fetch(`${baseUrl}/admin/settings`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              setSettings(data.data[0]);
            }
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      };
      fetchSettings();
    }, []);

    const handleCustomRefundSuccess = () => {
      // Refresh the payment intent data
      window.location.reload(); // Simple approach, could be improved with proper state management
    };

    // Parse JSON strings safely
    const parseJsonSafely = (jsonString: string | any, fallback: any = []) => {
      if (typeof jsonString === 'string') {
        try {
          return JSON.parse(jsonString);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          return fallback;
        }
      }
      return jsonString || fallback;
    };

    const bookingData = parseJsonSafely(paymentIntent.bookingData, []);
    const customerData = parseJsonSafely(paymentIntent.customerData, {});

    // Create customer object for ChargeModal
    const customer = {
      id: paymentIntent.customerId || '',
      guestFirstName: customerData.firstName,
      guestMiddleName: customerData.middleName,
      guestLastName: customerData.lastName,
      guestEmail: customerData.email,
      guestPhone: customerData.phone,
      guestNationality: customerData.nationality,
      stripeCustomerId: customerData.stripeCustomerId,
      vipStatus: false,
      totalNightStayed: 0,
      totalMoneySpent: 0,
      accountActivated: false,
      emailVerified: false,
      createdAt: paymentIntent.createdAt,
      updatedAt: paymentIntent.updatedAt,
    };

    // Process orders and charges data
    const allOrders = paymentIntent?.orders || [];
    const roomOrders = allOrders.filter((order: any) => order.paymentIntentId === paymentIntent?.id);
    const allCharges = paymentIntent?.charges || [];

    const toggleOrderExpansion = (orderId: string) => {
      setExpandedOrders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(orderId)) {
          newSet.delete(orderId);
        } else {
          newSet.add(orderId);
        }
        return newSet;
      });
    };

    const handleManageAttendees = (eventRegistryId: string) => {
        setSelectedEventGuestRegistryId(eventRegistryId);
        setShowManageAttendeesModal(true);
    };

    return (
      <>
      <div className="space-y-6 z-50">
        {/* Customer Information */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Information
            </h3>
            <div className="flex gap-2">
              {/* Events Management moved to accordion below */}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <div className="font-medium text-gray-900">
                  {customerData.firstName} {customerData.middleName}{" "}
                  {customerData.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="font-medium text-gray-900">{customerData.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <div className="font-medium text-gray-900">{customerData.phone}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nationality</label>
                <div className="font-medium text-gray-900">
                  {customerData.nationality || "Not specified"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <div className="font-medium text-gray-900">{paymentIntent.createdByAdmin ? "Admin" : "Customer"}</div>
              </div>
            </div>
  
            {/* Admin Notes or Special Requests */}
            {paymentIntent.createdByAdmin && paymentIntent.adminNotes && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="text-sm font-medium text-blue-700">Admin Notes</label>
                <div className="text-blue-900 mt-1">{paymentIntent.adminNotes}</div>
              </div>
            )}
  
            {!paymentIntent.createdByAdmin && customerData.specialRequests && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="text-sm font-medium text-green-700">Special Requests</label>
                <div className="text-green-900 mt-1">{customerData.specialRequests}</div>
              </div>
            )}
          </div>
        </div>
  
        {/* Bookings Details */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Bookings Details ({bookingData.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {bookingData.map((booking: BookingData, index: number) => {
                const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn))
                return (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-900">Booking #{index + 1}</h4>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">€{booking.totalPrice}</div>
                        <div className="text-sm text-gray-600">{nights} nights</div>
                      </div>
                    </div>
  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room</label>
                        <div className="font-medium text-gray-900">{booking.roomDetails?.name}</div>
                        <div className="text-sm text-gray-600">{booking.roomDetails?.description}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Capacity & Guests</label>
                        <div className="font-medium text-gray-900">
                          {booking.adults} adults (Capacity: {booking.roomDetails?.capacity})
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-in</label>
                        <div className="font-medium text-gray-900">
                          {format(new Date(booking.checkIn), "EEEE, MMMM dd, yyyy")}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-out</label>
                        <div className="font-medium text-gray-900">
                          {format(new Date(booking.checkOut), "EEEE, MMMM dd, yyyy")}
                        </div>
                      </div>
                      {booking.selectedRateOption && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500">Rate Policy Applied</label>
                          <div className="font-medium text-gray-900">{booking.selectedRateOption.name}</div>
                          <div className="text-sm text-gray-600">{booking.selectedRateOption.description}</div>
                        </div>
                      )}

                      {
                        booking.selectedEventsDetails && booking.selectedEventsDetails.length > 0 && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-500">Selected Events</label>
                            <div className="mt-2 space-y-3">
                              {booking.selectedEventsDetails.map((event, eventIndex) => (
                                <div key={eventIndex} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                  <div className="flex items-start gap-3">
                                    {event.image && (
                                      <img 
                                        src={event.image} 
                                        alt={event.name} 
                                        className="w-12 h-12 rounded-md object-cover flex-shrink-0" 
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h4 className="font-medium text-purple-900">{event.name}</h4>
                                          {event.enhancementName && (
                                            <p className="text-sm text-purple-700 font-medium">{event.enhancementName}</p>
                                          )}
                                          <p className="text-sm text-purple-600 mt-1">{event.description}</p>
                                          {event.eventDate && (
                                            <div className="text-xs text-purple-600 mt-1">
                                              <p>Event Date: {format(new Date(event.eventDate), "EEEE, MMMM dd, yyyy")}</p>
                                              <p>Event Time: {format(new Date(event.eventDate), "HH:mm")} (Italy time)</p>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <div className="font-bold text-purple-900">
                                            €{(() => {
                                              if (event.tax && event.tax > 0) {
                                                const netPrice = event.price / (1 + event.tax / 100);
                                                return netPrice.toFixed(2);
                                              }
                                              return event.price.toFixed(2);
                                            })()}
                                          </div>
                                          <div className="text-xs text-purple-600">
                                            {event.plannedAttendees} attendee{event.plannedAttendees !== 1 ? 's' : ''}
                                          </div>
                                          {event.tax && event.tax > 0 && (
                                            <div className="text-xs text-purple-600">
                                              VAT {event.tax}%: €{(() => {
                                                const totalGross = event.price * event.plannedAttendees;
                                                const taxAmount = totalGross * event.tax / (100 + event.tax);
                                                return taxAmount.toFixed(2);
                                              })()}
                                            </div>
                                          )}
                                          <div className="text-xs text-purple-600">
                                            Total: €{(event.price * event.plannedAttendees).toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      {
                        booking.selectedEnhancements && booking.selectedEnhancements.length > 0 && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-500">Selected Enhancements</label>
                            <div className="mt-2 space-y-3">
                              {booking.selectedEnhancements.map((enhancement, enhancementIndex) => (
                                <div key={enhancementIndex} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <div className="flex items-start gap-3">
                                    {enhancement.image && (
                                      <img 
                                        src={enhancement.image} 
                                        alt={enhancement.name} 
                                        className="w-12 h-12 rounded-md object-cover flex-shrink-0" 
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h4 className="font-medium text-green-900">{enhancement.name}</h4>
                                          <p className="text-sm text-green-600 mt-1">{enhancement.description}</p>
                                          <div className="flex items-center gap-3 mt-2 text-xs text-green-600">
                                            <span>Pricing: {enhancement.pricingType.replace('_', ' ').toLowerCase()}</span>
                                            {enhancement.quantity && (
                                              <span>Quantity: {enhancement.quantity}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <div className="font-bold text-green-900">
                                            €{(() => {
                                              if (enhancement.tax && enhancement.tax > 0) {
                                                const netPrice = enhancement.price / (1 + enhancement.tax / 100);
                                                return netPrice.toFixed(2);
                                              }
                                              return enhancement.price.toFixed(2);
                                            })()}
                                          </div>
                                          <div className="text-xs text-green-600"> {enhancement.pricingType.toLowerCase().replace('_', ' ')}</div>
                                          {enhancement.tax && enhancement.tax > 0 && (
                                            <div className="text-xs text-green-600">
                                              VAT {enhancement.tax}%: €{(() => {
                                                const totalGross = enhancement.price * (enhancement.quantity || 1);
                                                const taxAmount = totalGross * enhancement.tax / (100 + enhancement.tax);
                                                return taxAmount.toFixed(2);
                                              })()}
                                            </div>
                                          )}
                                          {enhancement.quantity && enhancement.quantity > 1 && (
                                            <div className="text-xs text-green-600">
                                              Total: €{(enhancement.price * enhancement.quantity).toFixed(2)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    </div>
  
                    {/* Rate Policy Details */}
                    {booking.selectedRateOption && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="text-sm font-semibold text-blue-800 mb-2 block">Policy Terms & Conditions</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${booking.selectedRateOption.refundable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-blue-900">
                              {booking.selectedRateOption.refundable ? 'Refundable' : 'Non-refundable'}
                            </span>
                          </div>
                          
                          {booking.selectedRateOption.cancellationPolicy && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              <span className="text-blue-900 capitalize">
                                {booking.selectedRateOption.cancellationPolicy.toLowerCase().replace('_', ' ')} cancellation
                              </span>
                            </div>
                          )}
                          
                          {booking.selectedRateOption.paymentStructure && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              <span className="text-blue-900">
                                {booking.selectedRateOption.paymentStructure === 'SPLIT_PAYMENT' ? 'Split payment (30% + 70%)' : 'Full payment required'}
                              </span>
                            </div>
                          )}
                          
                          {booking.selectedRateOption.fullPaymentDays && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              <span className="text-blue-900">
                                Final payment due {booking.selectedRateOption.fullPaymentDays} days before arrival
                              </span>
                            </div>
                          )}
                          
                          {booking.selectedRateOption.changeAllowedDays && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                              <span className="text-blue-900">
                                Changes allowed up to {booking.selectedRateOption.changeAllowedDays} days before
                              </span>
                            </div>
                          )}
                          
                        </div>
                        
                        {/* Admin Decision Support */}
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs text-amber-800 font-medium">
                            💡 <strong>Admin Note:</strong> Use these policy terms to make refund and modification decisions. 
                            {!booking.selectedRateOption.refundable && " This booking selected a non-refundable rate."}
                            {booking.selectedRateOption.paymentStructure === 'SPLIT_PAYMENT' && " This booking uses split payment structure."}
                          </p>
                        </div>
                      </div>
                    )}

                    {booking.roomDetails?.amenities && booking.roomDetails.amenities.length > 0 && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-500">Amenities</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {booking.roomDetails.amenities.map((amenity, idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Events Management Accordion */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div 
            className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsEventsAccordionOpen(!isEventsAccordionOpen)}
          >
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events Management
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Add event functionality here if needed
                }}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Manage Events
              </button>
              {isEventsAccordionOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {isEventsAccordionOpen && (
            <div className="p-6">
              {/* Extract events from booking data */}
              {(() => {
                const allEvents = bookingData.flatMap((booking: any) => 
                  booking.selectedEventsDetails || []
                );

                //@ts-ignore
                const eventGuestRegistry = paymentIntent?.eventGuestRegistries?.[0];
                
                // Merge eventGuestRegistry ID with events
                // All events in a booking share the same registry
                const eventsWithRegistryIds = allEvents.map((event: any) => ({
                  ...event,
                  eventGuestRegistryId: eventGuestRegistry?.id,
                  // Add registry details for better tracking
                  totalGuestCount: eventGuestRegistry?.totalGuestCount || 0,
                  confirmedGuests: eventGuestRegistry?.confirmedGuests || event.plannedAttendees || 0,
                  registryStatus: eventGuestRegistry?.status || 'PENDING'
                }));
                
                return eventsWithRegistryIds.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="h-12 w-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No events found</p>
                    <p className="text-sm text-gray-600 mt-0.5">No events have been booked for this reservation.</p>
                  </div>
                ) : (
                  <>
                    {/* Events Summary */}
                    <div className="bg-purple-50 rounded-md p-4 mb-4 border border-purple-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-medium text-purple-900">Events Summary</h4>
                          <p className="text-sm text-purple-700 mt-0.5">{eventsWithRegistryIds.length} events • Part of booking experience</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-900">
                            €{eventsWithRegistryIds.reduce((sum: number, event: any) => sum + ((event.price || 0) * (event.plannedAttendees || 1)), 0).toFixed(2)}
                          </p>
                          <p className="text-sm text-purple-600">Total value</p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Events */}
                    <div className="space-y-3">
                      {eventsWithRegistryIds.map((event: any, index: number) => (
                        <div key={index} className="bg-white rounded-md p-4 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all duration-200">
                          <div className="flex items-start gap-3">
                            {event.image && (
                              <img 
                                src={event.image} 
                                alt={event.name} 
                                className="w-16 h-16 rounded-md object-cover flex-shrink-0" 
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900">{event.name}</h5>
                                  {event.enhancementName && (
                                    <p className="text-xs text-purple-600 font-medium">{event.enhancementName}</p>
                                  )}
                                  <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                                  {event.eventDate && (
                                    <div className="text-xs text-purple-600 mt-2">
                                      <p>📅 {format(new Date(event.eventDate), "EEEE, MMMM dd, yyyy")}</p>
                                      <p>🕐 {format(new Date(event.eventDate), "HH:mm")} (Italy time)</p>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold text-purple-900">
                                    €{(() => {
                                      if (event.tax && event.tax > 0) {
                                        const netPrice = event.price / (1 + event.tax / 100);
                                        return netPrice.toFixed(2);
                                      }
                                      return event.price.toFixed(2);
                                    })()}
                                  </div>
                                  <div className="text-xs text-purple-600">
                                    {event.confirmedGuests || event.plannedAttendees} attendee{(event.confirmedGuests || event.plannedAttendees) !== 1 ? 's' : ''} confirmed
                                  </div>
                                  {event.totalGuestCount > 0 && event.totalGuestCount !== (event.confirmedGuests || event.plannedAttendees) && (
                                    <div className="text-xs text-gray-500">
                                      ({event.totalGuestCount} total in booking)
                                    </div>
                                  )}
                                  {event.tax && event.tax > 0 && (
                                    <div className="text-xs text-purple-600">
                                      VAT {event.tax}%: €{(() => {
                                        const totalGross = event.price * event.plannedAttendees;
                                        const taxAmount = totalGross * event.tax / (100 + event.tax);
                                        return taxAmount.toFixed(2);
                                      })()}
                                    </div>
                                  )}
                                  <div className="text-xs text-purple-600 font-medium">
                                    Total: €{(event.price * event.plannedAttendees).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Event Management Actions */}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  event.eventStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  event.eventStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  event.eventStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {event.eventStatus || 'SCHEDULED'}
                                </span>
                                
                                {event.registryStatus && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    event.registryStatus === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                    event.registryStatus === 'PROVISIONAL' ? 'bg-orange-100 text-orange-800' :
                                    event.registryStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {event.registryStatus}
                                  </span>
                                )}
                                
                                <button 
                                  onClick={() => {
                                    if (event.eventGuestRegistryId) {
                                      handleManageAttendees(event.eventGuestRegistryId);
                                    } else {
                                      alert('No event guest registry ID found for this event.');
                                    }
                                  }}
                                  className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  Manage Attendees
                                </button>
                                <button className="text-xs text-gray-600 hover:text-gray-800 font-medium">
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Payments & Charges Accordion */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div 
            className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsPaymentsAccordionOpen(!isPaymentsAccordionOpen)}
          >
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payments & Charges
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChargeModal(true);
                }}
                className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </button>
              {isPaymentsAccordionOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {isPaymentsAccordionOpen && (
            <div className="p-6">
              {/* Payment Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <div className="text-lg font-semibold text-gray-900">€{paymentIntent?.totalAmount || 0}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Paid Amount</label>
                    <div className="text-lg font-semibold text-green-600">
                      €{((paymentIntent?.totalAmount || 0) - (paymentIntent?.outstandingAmount || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Outstanding</label>
                    <div className={`text-lg font-semibold ${(paymentIntent?.outstandingAmount || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      €{(paymentIntent?.outstandingAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Charges List */}
              {allCharges.length === 0 ? (
                <div className="text-center py-6">
                  <CreditCard className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900">No additional charges found</p>
                  <p className="text-sm text-gray-600 mt-0.5">Only the main booking payment has been recorded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Charges</h4>
                  {allCharges.map((charge: any) => (
                    <div key={charge.id} className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {charge.description || `Charge #${charge.id.slice(-8)}`}
                              </p>
                              <p className="text-xs text-gray-600">
                                {format(new Date(charge.createdAt), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              charge.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                              charge.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                              charge.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {charge.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Amount:</span>
                              <span className="font-medium text-gray-900 ml-1">
                                {charge.currency ? `${charge.currency.toUpperCase()} ` : '€'}{charge.amount}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Method:</span>
                              <span className="font-medium text-gray-900 ml-1">
                                {charge.paymentMethod ? charge.paymentMethod.replace('_', ' ') : 'Room Charge'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Room Orders Accordion */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div 
            className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsOrdersAccordionOpen(!isOrdersAccordionOpen)}
          >
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Room Orders ({roomOrders.length})
            </h3>
            {isOrdersAccordionOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
          
          {isOrdersAccordionOpen && (
            <div className="p-6">
              {roomOrders.length === 0 ? (
                <div className="text-center py-6">
                  <div className="h-12 w-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No room orders found</p>
                  <p className="text-sm text-gray-600 mt-0.5">No items have been added to this booking's tab yet.</p>
                </div>
              ) : (
                <>
                  {/* Orders Summary */}
                  <div className="bg-green-50 rounded-md p-4 mb-4 border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-green-900">Room Orders Summary</h4>
                        <p className="text-sm text-green-700 mt-0.5">{roomOrders.length} orders • Added to booking tab</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-900">
                          €{roomOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-green-600">Total value</p>
                      </div>
                    </div>
                  </div>

                  {/* Individual Orders */}
                  <div className="space-y-3">
                    {roomOrders.map((order: any) => (
                      <div key={order.id} className="bg-white rounded-md p-4 border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all duration-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 
                                className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                Order #{order.id.slice(-6)} <span className="text-xs text-gray-500 ml-1">• Click for details</span>
                              </h5>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">€{order.total}</p>
                          </div>
                        </div>

                        {/* Order Items Dropdown */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => toggleOrderExpansion(order.id)}
                              className="w-full flex items-center justify-between text-sm group hover:bg-gray-50 rounded p-2 -m-2 transition-all duration-200"
                            >
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                                <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                  {order.items.length} Item{order.items.length > 1 ? 's' : ''}
                                </span>
                                <span className="text-gray-500">
                                  • €{order.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0).toFixed(2)}
                                </span>
                              </div>
                              <div className={`transform transition-transform duration-200 ${expandedOrders.has(order.id) ? 'rotate-180' : ''}`}>
                                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                              </div>
                            </button>
                            
                            {/* Expanded Items List */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              expandedOrders.has(order.id) ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
                            }`}>
                              <div className="space-y-2 bg-gray-50 rounded-md p-3">
                                {order.items.map((item: any, index: number) => {
                                  const totalPrice = (item.price || 0) * (item.quantity || 1);
                                  const taxAmount = item.tax ? (totalPrice * item.tax / (100 + item.tax)) : 0;
                                  
                                  return (
                                    <div 
                                      key={index} 
                                      className="bg-white rounded p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                                      onClick={() => setSelectedOrderId(order.id)}
                                    >
                                      <div className="flex justify-between items-start mb-1">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-sm text-gray-500">{item.quantity || 1}x</span>
                                            <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                          </div>
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">
                                          €{totalPrice.toFixed(2)}
                                        </div>
                                      </div>
                                      {item.tax > 0 && (
                                        <div className="ml-4 pt-1 border-t border-gray-100">
                                          <div className="flex justify-between items-center text-sm text-gray-500">
                                            <span>VAT {item.tax}%</span>
                                            <span>€{taxAmount.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
  
        {/* Payment Information */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Booking Payment Information
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(paymentIntent.status)}`}
                >
                  {paymentIntent.status}
                </span>
              </h3>
            </div>
            <div className="p-6">
              {/* Payment Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Subtotal</label>
                    <div className="text-lg font-semibold text-gray-900">€{(paymentIntent.totalAmount - paymentIntent.taxAmount).toFixed(2)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tax (VAT)</label>
                    <div className="text-lg font-semibold text-gray-900">€{paymentIntent.taxAmount.toFixed(2)}</div>
                  </div>
                  <div className="border-l-2 border-gray-200 pl-4">
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <div className="text-xl font-bold text-gray-900">€{paymentIntent.totalAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Currency</label>
                  <div className="font-medium text-gray-900">{paymentIntent.currency.toUpperCase()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Date</label>
                  <div className="font-medium text-gray-900">
                    {paymentIntent.paidAt ? format(new Date(paymentIntent.paidAt), "MMM dd, yyyy HH:mm") : "Not paid"}
                  </div>
                </div>
              </div>

              {/* Payment Structure Information */}
              {paymentIntent.paymentStructure && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">Payment Structure</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-blue-600">Payment Type</label>
                      <div className="font-medium text-blue-900">
                        {paymentIntent.paymentStructure === 'SPLIT_PAYMENT' ? 'Split Payment (30% + 70%)' : 'Full Payment'}
                      </div>
                    </div>
                    {paymentIntent.paymentStructure === 'SPLIT_PAYMENT' && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-blue-600">Prepaid Amount</label>
                          <div className="font-medium text-blue-900">€{paymentIntent.prepaidAmount?.toFixed(2) || 0}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-600">Remaining Amount</label>
                          <div className="font-medium text-blue-900">€{paymentIntent.remainingAmount?.toFixed(2) || 0}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-600">Remaining Due Date</label>
                          <div className="font-medium text-blue-900">
                            {paymentIntent.remainingDueDate 
                              ? format(new Date(paymentIntent.remainingDueDate), "MMM dd, yyyy")
                              : "Not set"
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                
                  {paymentIntent.paymentStructure === 'SPLIT_PAYMENT' &&
                  //@ts-ignore
                  paymentIntent?.remainingAmount > 0 && (
                    <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-yellow-800">
                          Remaining payment of €{paymentIntent.remainingAmount?.toFixed(2)} required
                        </span>
                        {paymentIntent.remainingDueDate && new Date() > new Date(paymentIntent.remainingDueDate) && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-md">
                            Overdue
                          </span>
                        )}
                      </div>
                      
                      {/* Second Payment Status Display */}
                      {paymentIntent.secondPaymentStatus && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-600">Second Payment Status: </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${
                            paymentIntent.secondPaymentStatus === 'SUCCEEDED' 
                              ? 'bg-green-100 text-green-800'
                              : paymentIntent.secondPaymentStatus === 'FAILED' || paymentIntent.secondPaymentStatus === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : paymentIntent.secondPaymentStatus === 'EXPIRED'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {paymentIntent.secondPaymentStatus}
                          </span>
                        </div>
                      )}
                      
                      {/* Admin Actions for Second Payment - Only show if second payment not succeeded */}
                      {paymentIntent.secondPaymentStatus !== 'SUCCEEDED' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(baseUrl + `/payment-intent/${paymentIntent.id}/create-second-payment`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  alert('Second payment intent created successfully! Email sent to customer.');
                                  console.log('Payment intent created:', data.data.paymentIntentId);
                                } else {
                                  const error = await response.json();
                                  alert(`Error: ${error.message}`);
                                }
                              } catch (error) {
                                console.error('Error creating payment link:', error);
                                alert('Failed to create payment intent');
                              }
                            }}
                            disabled={loadingAction}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Payment Intent
                          </button>
                          
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(baseUrl + `/payment-intent/${paymentIntent.id}/send-reminder`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  alert('Payment reminder sent successfully!');
                                } else {
                                  const error = await response.json();
                                  alert(`Error: ${error.message}`);
                                }
                              } catch (error) {
                                console.error('Error sending reminder:', error);
                                alert('Failed to send reminder');
                              }
                            }}
                            disabled={loadingAction}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5v-12" />
                            </svg>
                            Send Reminder
                          </button>
                          
                          {paymentIntent.remainingDueDate && new Date() > new Date(paymentIntent.remainingDueDate) && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(baseUrl + `/payment-intent/${paymentIntent.id}/send-reminder`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                  });
                                  
                                  if (response.ok) {
                                    alert('Overdue notice sent successfully!');
                                  } else {
                                    const error = await response.json();
                                    alert(`Error: ${error.message}`);
                                  }
                                } catch (error) {
                                  console.error('Error sending overdue notice:', error);
                                  alert('Failed to send overdue notice');
                                }
                              }}
                              disabled={loadingAction}
                              className="inline-flex items-center px-3 py-2 text-xs font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Send Overdue Notice
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Show dummy refund button when second payment is succeeded */}
                      {paymentIntent.secondPaymentStatus === 'SUCCEEDED' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              alert('Refund functionality will be implemented in the future.');
                            }}
                            disabled={loadingAction}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 14v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" />
                            </svg>
                            Refund Second Payment (Coming Soon)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
    
              {paymentDetails && (
                <div className="bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Stripe Payment Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {paymentDetails.payment_method?.card && (
                        <>
                          <div>
                            <span className="text-gray-600">Card:</span>
                            <span className="ml-2 font-medium">
                              **** **** **** {paymentDetails.payment_method.card.last4}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Brand:</span>
                            <span className="ml-2 font-medium capitalize">{paymentDetails.payment_method.card.brand}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Expires:</span>
                            <span className="ml-2 font-medium">
                              {paymentDetails.payment_method.card.exp_month}/{paymentDetails.payment_method.card.exp_year}
                            </span>
                          </div>
                        </>
                      )}
                      {paymentDetails.billing_details?.name && (
                        <div>
                          <span className="text-gray-600">Billing Name:</span>
                          <span className="ml-2 font-medium">{paymentDetails.billing_details.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
  
        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Actions</h3>
          </div>
          <div className="p-6">
            {/* Check-In/Check-Out Actions */}
            {paymentIntent.status === "SUCCEEDED" && (
              <div className="mb-6">
                <CheckInCheckOutButtons
                  paymentIntentId={paymentIntent.id}
                  customer={customerData}
                  type="paymentIntent"
                  id={paymentIntent.id}
                  bookings={paymentIntent.bookings || []}
                  outstandingAmount={paymentIntent.outstandingAmount || 0}
                  disabled={loadingAction}
                  variant="full"
                  onSuccess={() => window.location.reload()}
                />
              </div>
            )}
            
            <div className="flex gap-2 flex-wrap">
             {paymentIntent.status === "SUCCEEDED"  && <button
                onClick={() => onSendInvoice(paymentIntent.id)}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invoice
              </button>}
              {(paymentIntent.status === "SUCCEEDED" && 
                (!paymentIntent.refundStatus || 
                 paymentIntent.refundStatus === "NOT_REFUNDED")) && (
                <>
                  <button
                    onClick={() => setShowCustomPartialRefundModal(true)}
                    disabled={loadingAction}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Custom Partial Refund
                  </button>
                  <button
                    onClick={onRefund}
                    disabled={loadingAction}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Cancel & Refund
                  </button>
                </>
              )}
  
              {
                paymentIntent?.status === "CANCELLED" && !isDeletedTab && <button
                //@ts-ignore
                onClick={() => onDelete(paymentIntent.id)}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
               <Trash />
                Delete
              </button>
              }

              {
                isDeletedTab && onRestore && <button
                onClick={onRestore}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore
              </button>
              }

              {
                isDeletedTab && <button
                onClick={onDelete}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
               <Trash className="h-4 w-4 mr-2" />
                Hard Delete
              </button>
              }
  
              {
                paymentIntent.status === "PAYMENT_LINK_SENT" && (
                  <button
                  onClick={onRefund}
                  disabled={loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cancel Booking
                </button>
                )
              }

              {/* Invoice Export Buttons */}
              {!hideInvoiceButtons && (paymentIntent.status === "SUCCEEDED") && (
                <>
                  <button
                    onClick={() => window.open(`${baseUrl}/admin/payment-intent/${paymentIntent.id}/invoice`, '_blank')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export Invoice
                  </button>

                  {settings?.enableTaxOptimizationFeature && (
                    <button
                      onClick={() => setShowTaxModal(true)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Tax Invoice
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <CustomPartialRefundModal
        isOpen={showCustomPartialRefundModal}
        onClose={() => setShowCustomPartialRefundModal(false)}
        paymentIntent={paymentIntent}
        onRefundSuccess={handleCustomRefundSuccess}
      />

      <BookingOverviewModal
        isOpen={showBookingOverviewModal}
        onClose={() => setShowBookingOverviewModal(false)}
        paymentIntent={paymentIntent}
        onRefresh={onRefresh}
      />

      {showTaxModal && (
        <TaxOptimizationModal
          paymentIntent={paymentIntent}
          onClose={() => setShowTaxModal(false)}
        />
      )}
      
      {showEventsManagementModal && (
        <BookingEventsModal
          isOpen={showEventsManagementModal}
          onClose={() => setShowEventsManagementModal(false)}
          paymentIntentId={paymentIntent.id}
          bookings={paymentIntent.bookings}
        />
      )}

      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {showChargeModal && (
        <ChargeModal
          customer={customer}
          paymentIntentId={paymentIntent.id}
          step='create_payment'
          onClose={async () => {
            setShowChargeModal(false);
            if (onRefresh) {
              await onRefresh();
            }
          }}
        />
      )}

      {showManageAttendeesModal && selectedEventGuestRegistryId && (
        <ManageAttendeesModal
          isOpen={showManageAttendeesModal}
          onClose={() => {
            setShowManageAttendeesModal(false);
            setSelectedEventGuestRegistryId(null);
          }}
          eventGuestRegistryId={selectedEventGuestRegistryId}
        />
      )}
      </>
    )
  }
  