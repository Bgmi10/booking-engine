import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Loader, Mail, Calendar, Users, ChevronDown, ChevronUp, Bed, Image } from "lucide-react";
import { baseUrl } from "../utils/constants";
import Header from "./Header";

export default function Success() {
    const [sessionData, setSessionData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomDetailsOpen, setRoomDetailsOpen] = useState(true);
    const [enhancementsOpen, setEnhancementsOpen] = useState(true);
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    useEffect(() => {
        if (sessionId) {
            const fetchSession = async () => {
                try {
                    const response = await fetch(`${baseUrl}/sessions/${sessionId}`);
                    const data = await response.json();
                    
                    if (response.ok) {
                        setSessionData(data.data);
                    } else {
                        setError(data.message || "Failed to retrieve booking details");
                    }
                } catch (err) {
                    setError("Network error occurred. Please try again.");
                } finally {
                    setLoading(false);
                }
            };
            fetchSession();
        } else {
            setError("No session ID found");
            setLoading(false);
        }
    }, [sessionId]);

    const formatDate = (date: string) => {
        if (!date) return '';
        const d = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };

    const formatTime = (date: string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const calculateNights = (checkIn: string, checkOut: string) => {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="w-12 h-12 text-green-500" />;
            case 'PENDING':
                return <Clock className="w-12 h-12 text-yellow-500" />;
            case 'FAILED':
                return <XCircle className="w-12 h-12 text-red-500" />;
            default:
                return <CheckCircle className="w-12 h-12 text-green-500" />;
        }
    };

    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return "Your booking has been confirmed!";
            case 'PENDING':
                return "Your booking is being processed";
            case 'FAILED':
                return "Booking failed";
            default:
                return "Thank you for your booking!";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'text-green-600';
            case 'PENDING':
                return 'text-yellow-600';
            case 'FAILED':
                return 'text-red-600';
            default:
                return 'text-green-600';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading booking details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.href = '/booking'}
                        className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                    >
                        Return to Booking
                    </button>
                </div>
            </div>
        );
    }

    const booking = sessionData?.data?.booking;
    const payment = sessionData?.data;
    const nights = booking ? calculateNights(booking.checkIn, booking.checkOut) : 0;

    return (
        <>
        <Header />
        <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                {/* Success Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center mb-6">
                    {getStatusIcon(payment?.status)}
                    <h1 className={`text-2xl sm:text-3xl font-semibold mt-4 mb-2 ${getStatusColor(payment?.status)}`}>
                        {getStatusMessage(payment?.status)}
                    </h1>
                    
                    {payment?.status === 'COMPLETED' && (
                        <div className="flex items-center justify-center gap-2 text-gray-600 mb-4 flex-wrap">
                            <Mail className="w-5 h-5" />
                            <p className="text-sm sm:text-base">We've sent a booking confirmation to <strong>{booking?.guestEmail}</strong></p>
                        </div>
                    )}
                    
                    {payment?.status === 'PENDING' && (
                        <p className="text-gray-600 mb-4 text-sm sm:text-base">
                            Your payment is being processed. You'll receive a confirmation email shortly.
                        </p>
                    )}

                    {payment?.status === 'FAILED' && (
                        <div className="mb-4">
                            <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                Your payment could not be processed. Please try again.
                            </p>
                            <button
                                onClick={() => window.location.href = '/booking'}
                                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Booking Details */}
                {booking && payment?.status === 'COMPLETED' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-800">Booking Details</h2>
                            <p className="text-sm text-gray-500 mt-1 break-all sm:break-normal">Booking ID: {booking.id}</p>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Guest Information */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-800 mb-3">Guest Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                            <span className="text-gray-600">Name:</span>
                                            <span className="font-medium">{booking.guestName}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                            <span className="text-gray-600">Email:</span>
                                            <span className="font-medium break-all">{booking.guestEmail}</span>
                                        </div>
                                        {booking.guestPhone && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                                <span className="text-gray-600">Phone:</span>
                                                <span className="font-medium">{booking.guestPhone}</span>
                                            </div>
                                        )}
                                        {booking.guestNationality && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                                <span className="text-gray-600">Nationality:</span>
                                                <span className="font-medium">{booking.guestNationality}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-gray-800 mb-3">Stay Information</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-start gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                                            <div>
                                                <div className="font-medium">Check-in</div>
                                                <div className="text-gray-600">
                                                    {formatDate(booking.checkIn)} at {formatTime(booking.checkIn)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                                            <div>
                                                <div className="font-medium">Check-out</div>
                                                <div className="text-gray-600">
                                                    {formatDate(booking.checkOut)} at {formatTime(booking.checkOut)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                                            <div>
                                                <span className="font-medium">{booking.totalGuests} guest{booking.totalGuests > 1 ? 's' : ''}</span>
                                                <span className="text-gray-600"> • {nights} night{nights > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Room Details Dropdown */}
                            {booking.room && (
                                <div className="border border-gray-200 rounded-lg">
                                    <button
                                        onClick={() => setRoomDetailsOpen(!roomDetailsOpen)}
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Bed className="w-5 h-5 text-gray-500" />
                                            <h3 className="text-lg font-medium text-gray-800">Room Details</h3>
                                        </div>
                                        {roomDetailsOpen ? (
                                            <ChevronUp className="w-5 h-5 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        )}
                                    </button>
                                    
                                    {roomDetailsOpen && (
                                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="font-semibold text-gray-800 mb-2">{booking.room.name}</h4>
                                                    <p className="text-sm text-gray-600 mb-4">{booking.room.description}</p>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Capacity:</span>
                                                            <span className="font-medium">{booking.room.capacity} guests</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Base Price:</span>
                                                            <span className="font-medium">€{booking.room.price}/night</span>
                                                        </div>
                                                        {booking.metadata?.selectedRateOption && (
                                                            <div className="mt-3 p-2 bg-white rounded border">
                                                                <div className="text-sm font-medium">{booking.metadata.selectedRateOption.name}</div>
                                                                <div className="text-xs text-gray-600">{booking.metadata.selectedRateOption.description}</div>
                                                                {booking.metadata.selectedRateOption.refundable && (
                                                                    <div className="text-xs text-green-600 mt-1">✓ Refundable</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Room Images */}
                                                {booking.room.images && booking.room.images.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800 mb-3">Room Images</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {booking.room.images.map((image: { id: string, url: string }, index: number) => (
                                                                <div key={image.id} className="relative group">
                                                                    <img
                                                                        src={image.url}
                                                                        alt={`Room view ${index + 1}`}
                                                                        className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                                                        onError={(e) => {
                                                                            //@ts-ignore
                                                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NS4zMzMzIDY0TDc0LjY2NjcgNzQuNjY2N0g5NkwxMDYuNjY3IDY0TDEyOCA4NS4zMzMzVjEwNi42NjdINzJWODUuMzMzM0w4NS4zMzMzIDY0WiIgZmlsbD0iIzlDQTNBRiIvPgo8Y2lyY2xlIGN4PSI4OC44ODg5IiBjeT0iNDguODg4OSIgcj0iMTAuNjY2NyIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Special Requests */}
                            {booking.request && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-800 mb-3">Special Requests</h3>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                        {booking.request}
                                    </p>
                                </div>
                            )}

                            {/* Enhancements Dropdown */}
                            {booking.enhancementBookings && booking.enhancementBookings.length > 0 && (
                                <div className="border border-gray-200 rounded-lg">
                                    <button
                                        onClick={() => setEnhancementsOpen(!enhancementsOpen)}
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Image className="w-5 h-5 text-gray-500" />
                                            <h3 className="text-lg font-medium text-gray-800">Selected Enhancements</h3>
                                        </div>
                                        {enhancementsOpen ? (
                                            <ChevronUp className="w-5 h-5 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        )}
                                    </button>
                                    
                                    {enhancementsOpen && (
                                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                                            <div className="space-y-4">
                                                {booking.enhancementBookings.map((enhancement: any, index: number) => (
                                                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            {/* Enhancement Image */}
                                                            {enhancement.enhancement.image && (
                                                                <div className="flex-shrink-0">
                                                                    <img
                                                                        src={enhancement.enhancement.image}
                                                                        alt={enhancement.enhancement.title}
                                                                        className="w-full sm:w-24 h-24 object-cover rounded-lg"
                                                                        onError={(e) => {
                                                                            //@ts-ignore
                                                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00OCA0OEw0MC4xNiA1NS44NEg1NS44NEw2My42OCA0OEw3MiA1Ni4zMlY2NEgzMlY1Ni4zMkw0OCA0OFoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iNiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Enhancement Details */}
                                                            <div className="flex-grow">
                                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                                    <div className="flex-grow">
                                                                        <h4 className="font-medium text-gray-800 mb-1">{enhancement.enhancement.title}</h4>
                                                                        <p className="text-sm text-gray-600 mb-2">{enhancement.enhancement.description}</p>
                                                                        <div className="flex flex-wrap gap-1 text-xs">
                                                                            {enhancement.enhancement.availableDays.map((day: string, dayIndex: number) => (
                                                                                <span key={dayIndex} className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                                                    {day.slice(0, 3)}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="text-right flex-shrink-0">
                                                                        <div className="font-medium text-sm">€{enhancement.enhancement.price} × {enhancement.quantity}</div>
                                                                        <div className="text-xs text-gray-600">
                                                                            {enhancement.enhancement.pricingType === 'PER_GUEST' ? 'per guest' : 'per room'}
                                                                        </div>
                                                                        <div className="font-semibold text-sm text-gray-800 mt-1">
                                                                            Total: €{(enhancement.enhancement.price * enhancement.quantity).toFixed(2)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment Summary */}
                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-medium text-gray-800 mb-3">Payment Summary</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Amount Paid:</span>
                                        <span className="font-medium">€{(payment.amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Status:</span>
                                        <span className={`font-medium ${payment.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Payment Date:</span>
                                        <span className="font-medium">{formatDate(payment.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-center"
                                >
                                    Print Confirmation
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-center"
                                >
                                    Return to Home
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending/Failed States with minimal details */}
                {booking && payment?.status !== 'COMPLETED' && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-800 mb-3">Booking Reference</h3>
                        <p className="text-sm text-gray-600 break-all">Booking ID: {booking.id}</p>
                        <p className="text-sm text-gray-600">Guest: {booking.guestName}</p>
                        <p className="text-sm text-gray-600 break-all">Email: {booking.guestEmail}</p>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}