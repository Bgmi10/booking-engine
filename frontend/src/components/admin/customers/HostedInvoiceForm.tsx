import { useState } from 'react';
import { ArrowLeft, Mail, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import type { Customer } from '../../../hooks/useCustomers';

interface HostedInvoiceFormProps {
    customer: Customer;
    amount: string;
    currency: {
        code: string;
        symbol: string;
    };
    onBack: () => void;
    onClose: () => void;
    isProcessing: boolean;
    description: string;
    chargeType?: string;
    orderId?: string;
}

export default function HostedInvoiceForm({ customer, amount, currency, onBack, onClose, isProcessing, description, chargeType, orderId }: HostedInvoiceFormProps) {
    const [expiresAt, setExpiresAt] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState('12:00');
    const [localIsProcessing, setLocalIsProcessing] = useState(false);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        // Combine date and time
        const combinedDateTime = new Date(date);
        const [hours, minutes] = selectedTime.split(':');
        combinedDateTime.setHours(parseInt(hours), parseInt(minutes));
        setExpiresAt(combinedDateTime.toISOString());
        
        // Auto-close calendar after date selection
        setShowCalendar(false);
    };

    const handleTimeChange = (time: string) => {
        setSelectedTime(time);
        if (selectedDate) {
            const combinedDateTime = new Date(selectedDate);
            const [hours, minutes] = time.split(':');
            combinedDateTime.setHours(parseInt(hours), parseInt(minutes));
            setExpiresAt(combinedDateTime.toISOString());
            
            // Auto-close calendar after time selection
            setShowCalendar(false);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        
        // Add all days in the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const isDateDisabled = (date: Date) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date < now;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!expiresAt) {
            setError('Please select an expiration date and time');
            return;
        }

        // Validate that expiration date is in the future
        const selectedDateTime = new Date(expiresAt);
        const now = new Date();
        if (selectedDateTime <= now) {
            setError('Expiration date must be in the future');
            return;
        }

        setLocalIsProcessing(true);
        try {
            const response = await fetch(`${baseUrl}/admin/charges/create-qr-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    customerId: customer.id,
                    amount: parseFloat(amount),
                    description: description.trim() || `Hosted Invoice - ${currency.symbol}${amount}`,
                    currency: currency.code.toLowerCase(),
                    isHostedInvoice: true,
                    expiresAt: selectedDateTime.toISOString(),
                    type: chargeType,
                    orderId: orderId
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                setError(data.message || 'Failed to create hosted invoice');
            }
        } catch (error) {
            console.error('Error creating hosted invoice:', error);
            setError('An error occurred while creating the hosted invoice');
        } finally {
            setLocalIsProcessing(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <Mail className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Hosted Invoice Created!</h3>
                        <p className="text-sm text-gray-600">
                            A payment link has been sent to {customer.guestEmail}. The customer can pay using the link in their email.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">Hosted Invoice</h2>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expiration Date & Time *
                            </label>
                            
                            {/* Date Picker Button */}
                            <button
                                type="button"
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between"
                                disabled={isProcessing || localIsProcessing}
                            >
                                <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedDate ? `${formatDate(selectedDate)} at ${formatTime(selectedTime)}` : 'Select date and time'}
                                </span>
                                <Calendar className="h-5 w-5 text-gray-400" />
                            </button>

                            {/* Calendar Popup with Integrated Time Picker */}
                            {showCalendar && (
                                <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 w-full max-w-2xl">
                                    <div className="flex gap-6">
                                        {/* Calendar Section */}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                                    className="p-1 hover:bg-gray-100 rounded"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <span className="font-medium">
                                                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                                    className="p-1 hover:bg-gray-100 rounded"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-7 gap-1 mb-2">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                                    <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                                                        {day}
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="grid grid-cols-7 gap-1">
                                                {getDaysInMonth(currentMonth).map((date, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => date && !isDateDisabled(date) && handleDateSelect(date)}
                                                        disabled={!date || isDateDisabled(date)}
                                                        className={`p-2 text-sm rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                            !date ? 'invisible' : ''
                                                        } ${
                                                            date && selectedDate && date.toDateString() === selectedDate.toDateString()
                                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                : date && isDateDisabled(date)
                                                                ? 'text-gray-300 cursor-not-allowed'
                                                                : 'text-gray-900 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        {date?.getDate()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Time Picker Section */}
                                        <div className="w-48 border-l pl-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Time
                                            </label>
                                            <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                                                {Array.from({ length: 24 }, (_, hour) => 
                                                    Array.from({ length: 4 }, (_, minute) => minute * 15).map(minute => {
                                                        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                                        const displayTime = formatTime(timeString);
                                                        return (
                                                            <button
                                                                key={timeString}
                                                                type="button"
                                                                onClick={() => handleTimeChange(timeString)}
                                                                className={`p-2 text-xs rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                                    selectedTime === timeString
                                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                        : 'text-gray-900 hover:bg-blue-50'
                                                                }`}
                                                            >
                                                                {displayTime}
                                                            </button>
                                                        );
                                                    })
                                                ).flat()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-gray-500 mt-1">
                                The payment link will expire after this date and time
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Invoice Summary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Customer:</span>
                                    <span className="font-medium">{customer.guestFirstName} {customer.guestLastName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium">{customer.guestEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="font-medium">{currency.symbol}{amount}</span>
                                </div>
                                {selectedDate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Expires:</span>
                                        <span className="font-medium">{formatDate(selectedDate)} at {formatTime(selectedTime)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onBack}
                                disabled={isProcessing || localIsProcessing}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing || localIsProcessing || !expiresAt}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                            >
                                {isProcessing || localIsProcessing ? 'Creating...' : 'Send Invoice'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 