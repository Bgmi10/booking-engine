import { useState, useMemo, useEffect } from "react";
import { baseUrl } from "../utils/constants";
import { ChevronDown, ChevronUp, LoaderIcon, Search, CheckCircle, Gift, Sparkles } from "lucide-react";
import CountryList from 'country-list-with-dial-code-and-flag';
import confetti from 'canvas-confetti';
import { calculateNights } from "../utils/format";

export default function Details({ 
    bookingData, 
    bookingItems, 
    availabilityData,
    taxPercentage = 0.1 // Default to 10% if not provided
}: { 
    bookingData: any, 
    bookingItems: any, 
    availabilityData: any,
    taxPercentage?: number 
}) {
    // Form states
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        nationality: "",
        specialRequests: "",
        carNumberPlate: ""  // Add license plate field
    });    

    // Voucher states
    const [voucherCode, setVoucherCode] = useState(bookingData.promotionCode || "");
    const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
    const [voucherError, setVoucherError] = useState("");
    const [voucherData, setVoucherData] = useState<any>(null);
    const [showVoucherDetails, setShowVoucherDetails] = useState(false);

    // UI states
    const [showNationality, setShowNationality] = useState(false);
    const [nationalitySearch, setNationalitySearch] = useState("");
    //@ts-ignore
    const [selectedCountry, setSelectedCountry] = useState<any>(null);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [receiveMarketing, setReceiveMarketing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<any>({});    
    const [apiError, setApiError] = useState("");
    
    const countries = CountryList.getAll();
    
    // Validate voucher code on component mount if code exists
    useEffect(() => {
        if (voucherCode) {
            validateVoucher();
        }
    }, []);

    // Validate voucher code
    const validateVoucher = async () => {
        if (!voucherCode.trim()) {
            setVoucherError("Please enter a promotional code");
            setVoucherData(null);
            return;
        }

        setIsValidatingVoucher(true);
        setVoucherError("");

        try {
            const response = await fetch(`${baseUrl}/vouchers/validate/${voucherCode}`);
            const data = await response.json();

            if (response.ok) {
                setVoucherData(data.data);
                setVoucherError("");
                setShowVoucherDetails(true);
                
                // Trigger confetti animation
                const duration = 3 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

                function randomInRange(min: number, max: number) {
                    return Math.random() * (max - min) + min;
                }

                const interval: any = setInterval(function() {
                    const timeLeft = animationEnd - Date.now();

                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }

                    const particleCount = 50 * (timeLeft / duration);
                    
                    // since particles fall down, start a bit higher than random
                    confetti({
                        ...defaults,
                        particleCount,
                        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                    });
                    confetti({
                        ...defaults,
                        particleCount,
                        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                    });
                }, 250);
            } else {
                setVoucherError(data.message || "Invalid promotional code");
                setVoucherData(null);
                setShowVoucherDetails(false);
            }
        } catch (error) {
            setVoucherError("Error validating promotional code");
            setVoucherData(null);
            setShowVoucherDetails(false);
        } finally {
            setIsValidatingVoucher(false);
        }
    };

    // Calculate final price with voucher discount
    const calculateFinalPrice = () => {
        const subtotal = calculateSubtotal();
        const tax = calculateDisplayTax(subtotal);
        const total = subtotal; // Total already includes tax

        if (voucherData) {
            if (voucherData.type === "DISCOUNT" && voucherData.discountPercent) {
                const discount = (total * voucherData.discountPercent) / 100;
                return {
                    subtotal,
                    tax,
                    originalTotal: total,
                    discount,
                    finalTotal: total - discount
                };
            } else if (voucherData.type === "FIXED" && voucherData.fixedAmount) {
                const discount = Math.min(voucherData.fixedAmount, total);
                return {
                    subtotal,
                    tax,
                    originalTotal: total,
                    discount,
                    finalTotal: total - discount
                };
            }
        }

        return {
            subtotal,
            tax,
            originalTotal: total,
            discount: 0,
            finalTotal: total
        };
    };

    // Filter countries based on search for nationality dropdown
    const filteredCountries = useMemo(() => {
        if (!nationalitySearch.trim()) return countries;
        return countries.filter((country: any) => 
            country.name.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
            country.code.toLowerCase().includes(nationalitySearch.toLowerCase())
        );
    }, [nationalitySearch, countries]);
    
    // Helper functions from Summary component
    const formatDate = (date: string) => {
        if (!date) return '';
        const d = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        
        return `${days[d.getDay()]} ${d.getDate().toString().padStart(2, '0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
    };
    
    const calculateItemBasePrice = (item: any) => {
        const nights = calculateNights(item.checkIn, item.checkOut);
        const rooms = item.rooms || 1;
        const ratePrice = item.selectedRateOption?.price || 0;
        return ratePrice * nights * rooms;
    };

    const calculateItemEnhancementsPrice = (item: any) => {
        if (!item.selectedEnhancements || item.selectedEnhancements.length === 0) {
            return 0;
        }
        return item.selectedEnhancements.reduce((sum: number, enhancement: any) => {
            return sum + (enhancement.price * item.adults);
        }, 0);
    };

    const calculateItemTotal = (item: any) => {
        const basePrice = calculateItemBasePrice(item);
        const enhancementsPrice = calculateItemEnhancementsPrice(item);
        return basePrice + enhancementsPrice;
    };

    const getRoomName = (item: any) => {
        if (item.roomDetails?.name) {
            return item.roomDetails.name;
        }
        
        const roomId = item.selectedRoom;
        if (availabilityData?.availableRooms) {
            const room = availabilityData.availableRooms.find((r: any) => r.id === roomId);
            if (room?.name) {
                return room.name;
            }
        }
        
        if (roomId === "54202303-615d-4cf0-bf79-f1b46dfccc65") {
            return "Fagiano - Garden View Terrace";
        }
        return "Fenicottero - Vineyard View";
    };

    // Prepare all items for display
    const getAllItems = () => {
        const items = [...bookingItems];
        
        const isCurrentBookingComplete = bookingData.selectedRoom && 
            (bookingData.selectedRateOption || bookingData.totalPrice > 0);
        
        if (isCurrentBookingComplete) {
            const isAlreadyAdded = bookingItems.some((item: any) => 
                item.id === 'current' || 
                (item.selectedRoom === bookingData.selectedRoom && 
                 item.checkIn === bookingData.checkIn && 
                 item.checkOut === bookingData.checkOut));
            
            if (!isAlreadyAdded) {
                const selectedRoom = availabilityData?.availableRooms?.find((room: any) => room.id === bookingData.selectedRoom);
                items.push({ 
                    ...bookingData, 
                    id: 'current',
                    roomDetails: selectedRoom
                });
            }
        }
        
        return items;
    };

    const allItems = getAllItems();

    const calculateSubtotal = () => {
        return allItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };
   
    const calculateDisplayTax = (subtotal: number) => {
        // taxPercentage is already in decimal form (e.g., 0.10 for 10%)
        return Math.round(subtotal * taxPercentage * 100) / 100;
    };

    const priceDetails = calculateFinalPrice();

    // Validation functions
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    
const validatePhone = (phone: string) => {
    // Remove spaces and special characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if phone starts with + and has valid length
    if (!cleanPhone.startsWith('+')) {
        return { isValid: false, error: "Phone number must start with country code (e.g., +1, +44)" };
    }
    
    // Remove the + for further validation
    const phoneWithoutPlus = cleanPhone.substring(1);
    
    // Check if it contains only digits after the +
    if (!/^\d+$/.test(phoneWithoutPlus)) {
        return { isValid: false, error: "Phone number can only contain digits after country code" };
    }
    
    // Check total length (country code + phone number should be 7-15 digits)
    if (phoneWithoutPlus.length < 7 || phoneWithoutPlus.length > 15) {
        return { isValid: false, error: "Phone number must be 7-15 digits including country code" };
    }
    
    return { isValid: true, error: null };
};

const validateDialCode = (phone: string, countries: any[]) => {
    if (!phone || !phone.startsWith('+')) {
        return { isValid: false, error: "Phone number must include country code" };
    }
    
    // Extract potential dial codes (1-4 digits after +)
    const phoneWithoutPlus = phone.substring(1);
    
    // Try to match dial codes of different lengths (1-4 digits)
    for (let i = 1; i <= 4; i++) {
        const potentialDialCode = '+' + phoneWithoutPlus.substring(0, i);
        const matchingCountry = countries.find(country => 
            country.dial_code === potentialDialCode
        );
        
        if (matchingCountry) {
            // Check if remaining digits form a valid phone number
            const remainingDigits = phoneWithoutPlus.substring(i);
            if (remainingDigits.length >= 4 && remainingDigits.length <= 12) {
                return { 
                    isValid: true, 
                    error: null, 
                    country: matchingCountry,
                    dialCode: potentialDialCode,
                    phoneNumber: remainingDigits
                };
            }
        }
    }
    
    return { isValid: false, error: "Invalid country code or phone number format" };
};

// Updated validateForm function
const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
        newErrors.firstName = "First name must be at least 2 characters";
    }

    if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
        newErrors.lastName = "Last name must be at least 2 characters";
    }
    
    if (!formData.email.trim()) {
        newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
        newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.nationality.trim()) {
        newErrors.nationality = "Nationality is required";
    }
    
    if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
    } else {
        // Validate phone format first
        const phoneValidation = validatePhone(formData.phone);
        if (!phoneValidation.isValid) {
            newErrors.phone = phoneValidation.error;
        } else {
            // Then validate dial code
            const dialCodeValidation = validateDialCode(formData.phone, countries);
            if (!dialCodeValidation.isValid) {
                newErrors.phone = dialCodeValidation.error;
            }
        }
    }
    
    if (!agreeToTerms) {
        newErrors.terms = "You must agree to the terms and conditions";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};


    // Handle nationality change and update phone code
    const handleNationalityChange = (country: any) => {
        setSelectedCountry(country);
        setFormData(prev => ({
            ...prev,
            nationality: country.name,
            phone: country.dial_code
        }));
        setShowNationality(false);
        setNationalitySearch("");
        
        // Clear errors
        if (errors.nationality) {
            setErrors((prev: any) => ({
                ...prev,
                nationality: undefined
            }));
        }
    };

    // Check if form is complete and valid
    const isFormComplete = () => {
        return (
            formData.firstName.trim().length >= 2 &&
            formData.lastName.trim().length >= 2 &&
            formData.email.trim() &&
            validateEmail(formData.email) &&
            formData.nationality.trim() &&
            formData.phone.trim() &&
            agreeToTerms
        );
    };
    
    console.log(voucherData)
    // Handle form submission and Stripe checkout
    const handleConfirmAndPay = async () => {
        if (!validateForm()) {
            return;
        }

        setIsProcessing(true);
        try {
            // Calculate current charge amount for split payments
            const currentChargeAmount = allItems.reduce((sum, item) => {
                const itemTotal = calculateItemTotal(item);
                return sum + (item.selectedPaymentStructure === 'SPLIT_PAYMENT' ? itemTotal * 0.3 : itemTotal);
            }, 0);
            
            const bookingPayload = {
                customerDetails: {
                    firstName: formData.firstName,
                    middleName: formData.middleName.trim() || null,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone.trim(),
                    nationality: formData.nationality,
                    specialRequests: formData.specialRequests,
                    carNumberPlate: formData.carNumberPlate.trim() || null,
                    receiveMarketing: receiveMarketing
                },
                bookingItems: allItems,
                totalAmount: priceDetails.finalTotal,
                currentChargeAmount: currentChargeAmount, // Current charge amount for split payments
                taxAmount: calculateDisplayTax(priceDetails.originalTotal),
                voucherCode: voucherData ? voucherCode : null,
                voucherDiscount: priceDetails.discount,
                voucherProducts: voucherData ? voucherData.products : null,
                originalAmount: priceDetails.originalTotal
            };

            const response = await fetch(baseUrl + "/bookings/create-checkout-session", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();
            if (response.status === 200 && data.data.url) {
                window.location.href = data.data.url;
            } else {
                setApiError(data.message);
            }
        } catch (error: any) {
            console.error('Error creating checkout session:', error);
            setApiError(error.message || "Error creating booking");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev: any) => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-6 min-h-screen">
            <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Contact Details</h1>
            </div>

            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6 text-center">
                    <span className="text-base sm:text-lg font-semibold text-gray-800">Your details</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 sm:p-6">
                    <div className="text-left lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="firstName" 
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className={`mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border ${errors.firstName ? 'border-red-300' : 'border-gray-300'}`}
                                placeholder="First Name"
                                aria-required="true"
                                aria-invalid={!!errors.firstName}
                                aria-describedby={errors.firstName ? "firstName-error" : undefined}
                            />
                            {errors.firstName && <p id="firstName-error" className="text-red-500 text-xs mt-1" role="alert">{errors.firstName}</p>}
                        </div>

                        <div>
                            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
                                Middle Name
                            </label>
                            <input 
                                type="text" 
                                id="middleName" 
                                value={formData.middleName}
                                onChange={(e) => handleInputChange('middleName', e.target.value)}
                                className="mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border border-gray-300"
                                placeholder="Middle Name (optional)"
                            />
                        </div>

                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="lastName" 
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className={`mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border ${errors.lastName ? 'border-red-300' : 'border-gray-300'}`}
                                placeholder="Last Name"
                                aria-required="true"
                                aria-invalid={!!errors.lastName}
                                aria-describedby={errors.lastName ? "lastName-error" : undefined}
                            />
                            {errors.lastName && <p id="lastName-error" className="text-red-500 text-xs mt-1" role="alert">{errors.lastName}</p>}
                        </div>
                    </div>
                    
                    <div className="text-left">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="email" 
                            id="email" 
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                            placeholder="Email"
                            aria-required="true"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "email-error" : undefined}
                        />
                        {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1" role="alert">{errors.email}</p>}
                    </div>

                    <div className="text-left relative">
                        <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                            Nationality <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <button 
                                type="button"
                                id="nationality" 
                                onClick={() => setShowNationality(!showNationality)}
                                className={`mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 cursor-pointer focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border text-left ${errors.nationality ? 'border-red-300' : 'border-gray-300'}`}
                                aria-required="true"
                                aria-invalid={!!errors.nationality}
                                aria-describedby={errors.nationality ? "nationality-error" : undefined}
                                aria-expanded={showNationality}
                                aria-haspopup="listbox"
                            >
                                {formData.nationality || "Select nationality"}
                            </button>
                            <div className="absolute right-3 top-3 pointer-events-none">
                                {showNationality ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                            {showNationality && (
                                <div className="absolute top-12 left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 z-10" role="listbox">
                                    <div className="p-3 border-b border-gray-200">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                                            <input
                                                type="text"
                                                placeholder="Search nationality..."
                                                value={nationalitySearch}
                                                onChange={(e) => setNationalitySearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500"
                                                aria-label="Search nationalities"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto p-2">
                                        {filteredCountries.map((country: any, index: number) => (
                                            <button 
                                                key={index} 
                                                type="button"
                                                className="w-full hover:bg-gray-100 p-2 rounded-md cursor-pointer text-left flex items-center gap-2" 
                                                onClick={() => handleNationalityChange(country)}
                                                role="option"
                                                aria-selected={formData.nationality === country.name}
                                            >
                                                <span className="text-xl">{country.flag}</span>
                                                <span className="text-sm">{country.name}</span>
                                            </button>
                                        ))}
                                        {filteredCountries.length === 0 && (
                                            <div className="p-2 text-sm text-gray-500 text-center">
                                                No countries found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {errors.nationality && <p id="nationality-error" className="text-red-500 text-xs mt-1" role="alert">{errors.nationality}</p>}
                    </div>

                    <div className="text-left">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="tel" 
                            id="phone" 
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
                            placeholder="Phone number with country code"
                            aria-required="true"
                            aria-invalid={!!errors.phone}
                            aria-describedby={errors.phone ? "phone-error" : undefined}
                        />
                        {errors.phone && <p id="phone-error" className="text-red-500 text-xs mt-1" role="alert">{errors.phone}</p>}
                    </div>

                    <div className="text-left">
                        <label htmlFor="carNumberPlate" className="block text-sm font-medium text-gray-700">
                            Car License Plate <span className="text-gray-500 text-xs">(optional)</span>
                        </label>
                        <input 
                            type="text" 
                            id="carNumberPlate" 
                            value={formData.carNumberPlate}
                            onChange={(e) => handleInputChange('carNumberPlate', e.target.value.toUpperCase())}
                            className="mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border border-gray-300"
                            placeholder="e.g., ABC123"
                            maxLength={10}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            For automatic gate access during your stay
                        </p>
                    </div>

                    <div className="text-left col-span-1 lg:col-span-2">
                        <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700">Special requests</label>
                        <textarea 
                            id="specialRequests" 
                            value={formData.specialRequests}
                            onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                            className="mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-4 outline-none border border-gray-300" 
                            placeholder="Any special requests..."
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Promotional Code Section */}
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800">Promotional Code</h3>
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={voucherCode}
                                onChange={(e) => {
                                    setVoucherCode(e.target.value);
                                    setVoucherError("");
                                    setVoucherData(null);
                                    setShowVoucherDetails(false);
                                }}
                                placeholder="Enter promotional code"
                                className={`w-full px-4 py-2 border rounded-md focus:outline-none transition-all duration-200 ${
                                    voucherError ? 'border-red-300' : 'border-gray-300'
                                } ${showVoucherDetails ? 'border-green-300' : ''}`}
                            />
                            {voucherError && (
                                <p className="text-red-500 text-sm mt-1 animate-shake">{voucherError}</p>
                            )}
                        </div>
                        <button
                            onClick={validateVoucher}
                            disabled={isValidatingVoucher}
                            className={`px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 ${
                                showVoucherDetails ? 'bg-green-600 hover:bg-green-700' : ''
                            }`}
                        >
                            {isValidatingVoucher ? (
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                            ) : showVoucherDetails ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                "Apply"
                            )}
                        </button>
                    </div>

                    {showVoucherDetails && voucherData && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md animate-slideDown">
                            <div className="flex items-start gap-3">
                                <div className="relative">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 " />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-green-800">Promotional Code Applied!</h4>
                                    <p className="text-sm text-green-700 mt-1">
                                        {voucherData.type === "DISCOUNT" && (
                                            <span className="inline-flex items-center gap-1">
                                                <span className="font-bold">{voucherData.discountPercent}%</span> discount applied
                                            </span>
                                        )}
                                        {voucherData.type === "FIXED" && (
                                            <span className="inline-flex items-center gap-1">
                                                <span className="font-bold">€{voucherData.fixedAmount}</span> discount applied
                                            </span>
                                        )}
                                        {voucherData.type === "PRODUCT" && (
                                            "Free product included"
                                        )}
                                    </p>
                                    
                                    {voucherData.type === "PRODUCT" && voucherData.products && (
                                        <div className="mt-3 space-y-2">
                                            {voucherData.products.map((product: any) => (
                                                <div 
                                                    key={product.id} 
                                                    className="flex items-center gap-3 bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
                                                >
                                                    {product.imageUrl && (
                                                        <img 
                                                            src={product.imageUrl} 
                                                            alt={product.name}
                                                            className="w-12 h-12 object-cover rounded-md"
                                                        />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900">{product.name}</p>
                                                        <p className="text-sm text-gray-500">{product.description}</p>
                                                        <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                                                            <Gift className="w-4 h-4" />
                                                            Free with this code
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Booking Summary */}
            {allItems.length > 0 && (
                <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
                    <div className="p-4 sm:p-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Booking Summary</h3>
                        
                        {allItems.map((item, index) => {
                            const nights = calculateNights(item.checkIn, item.checkOut);
                            const roomBasePrice = calculateItemBasePrice(item);
                            const enhancementsPrice = calculateItemEnhancementsPrice(item);
                            const itemTotal = roomBasePrice + enhancementsPrice;
                            const rooms = item.rooms || 1;
                            
                            return (
                                <div key={item.id || index} className="mb-6 pb-4 border-b border-gray-100 last:border-b-0">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                                        <div className="flex-1">
                                            <div className="text-gray-800 font-medium text-base sm:text-lg">
                                                {getRoomName(item)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {formatDate(item.checkIn)} - {formatDate(item.checkOut)} • {nights} night{nights > 1 ? 's' : ''} • {rooms} room{rooms > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <span className="font-semibold text-lg text-right">€{itemTotal.toFixed(2)}</span>
                                    </div>
                                    
                                    {/* Room Rate Breakdown */}
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between text-gray-600">
                                            <span className="flex-1 pr-2">
                                                {item.selectedRateOption?.name || 'Standard Rate'} ({nights} × {rooms} × €{item.selectedRateOption?.price || 0})
                                                {item.selectedPaymentStructure === 'SPLIT_PAYMENT' && (
                                                    <span className="ml-2 inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        Split Payment
                                                    </span>
                                                )}
                                            </span>
                                            <span className="font-medium">€{roomBasePrice.toFixed(2)}</span>
                                        </div>
                                        
                                        {/* Split Payment Breakdown */}
                                        {item.selectedPaymentStructure === 'SPLIT_PAYMENT' && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <h5 className="text-sm font-semibold text-blue-800 mb-2">Payment Structure</h5>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between text-blue-700">
                                                        <span>• Current charge (30%):</span>
                                                        <span className="font-medium">€{(itemTotal * 0.3).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-blue-600">
                                                        <span>• Remaining balance (70%):</span>
                                                        <span>€{(itemTotal * 0.7).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                {item.selectedRateOption?.fullPaymentDays && (
                                                    <p className="text-xs text-blue-600 mt-2">
                                                        Remaining balance due {item.selectedRateOption.fullPaymentDays} days before arrival
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Enhancements Breakdown */}
                                        {item.selectedEnhancements && item.selectedEnhancements.length > 0 && (
                                            <div className="space-y-1">
                                                {item.selectedEnhancements.map((enhancement: any, enhIndex: number) => {
                                                    const quantity = enhancement.pricingType === "PER_GUEST" 
                                                        ? item.adults * rooms 
                                                        : rooms;
                                                    const enhancementTotal = enhancement.price * quantity;
                                                    
                                                    return (
                                                        <div key={enhIndex} className="flex justify-between text-gray-600">
                                                            <span className="flex-1 pr-2">
                                                                {enhancement.title} 
                                                                ({quantity} × €{enhancement.price})
                                                                {enhancement.pricingType === "PER_GUEST" && (
                                                                    <span className="text-xs text-gray-500"> per guest</span>
                                                                )}
                                                            </span>
                                                            <span className="font-medium">€{enhancementTotal.toFixed(2)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        
                        <div className="space-y-3 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Subtotal</span>
                                <span className="font-medium">€{priceDetails.subtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">IVA {(taxPercentage * 100).toFixed(0)}%</span>
                                <div className="text-right">
                                    <div className="font-medium">€{priceDetails.tax.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">Taxes included in price</div>
                                </div>
                            </div>

                            {priceDetails.discount > 0 && (
                                <div className="flex justify-between items-center text-green-600">
                                    <span>Discount</span>
                                    <span className="font-medium">-€{priceDetails.discount.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Show current charge total for split payments */}
                            {allItems.some(item => item.selectedPaymentStructure === 'SPLIT_PAYMENT') && (
                                <div className="flex justify-between items-center pt-3 border-t border-blue-200 bg-blue-50 -mx-6 px-6 py-3 rounded-lg">
                                    <span className="text-lg font-semibold text-blue-800">Current Charge</span>
                                    <span className="text-lg font-semibold text-blue-800">
                                        €{allItems.reduce((sum, item) => {
                                            const itemTotal = calculateItemTotal(item);
                                            return sum + (item.selectedPaymentStructure === 'SPLIT_PAYMENT' ? itemTotal * 0.3 : itemTotal);
                                        }, 0).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-gray-300">
                                <span className="text-lg sm:text-xl font-semibold">Total Booking Value</span>
                                <div className="text-right">
                                    {priceDetails.discount > 0 && (
                                        <span className="text-sm text-gray-500 line-through mr-2">
                                            €{priceDetails.originalTotal.toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-lg sm:text-xl font-semibold">
                                        €{priceDetails.finalTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Terms and Conditions */}
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 mt-6">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="agreeTerms"
                                    checked={agreeToTerms}
                                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                                    className="mt-1 h-4 w-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500 flex-shrink-0"
                                    aria-required="true"
                                    aria-invalid={!!errors.terms}
                                    aria-describedby={errors.terms ? "terms-error" : undefined}
                                />
                                <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                                    I agree to{" "}
                                    <a href="https://www.latorre.farm/terms" target="_blank" rel="noopener noreferrer" className="text-gray-800 underline hover:no-underline">
                                        Property T&C
                                    </a>{" "}
                                    and{" "}
                                    <a href="https://www.latorre.farm/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-800 underline hover:no-underline">
                                        Property Privacy Policy
                                    </a>
                                    . <span className="text-red-500">*</span>
                                </label>
                            </div>
                            {errors.terms && <p id="terms-error" className="text-red-500 text-xs" role="alert">{errors.terms}</p>}

                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="receiveMarketing"
                                    checked={receiveMarketing}
                                    onChange={(e) => setReceiveMarketing(e.target.checked)}
                                    className="mt-1 h-4 w-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500 flex-shrink-0"
                                />
                                <label htmlFor="receiveMarketing" className="text-sm text-gray-700">
                                    I'd like to occasionally receive marketing updates from La Torre sulla via Francigena.
                                </label>
                              
                            </div>
                            <div className="mb-4">
                              {apiError && <span className="text-red-500 mb-2">*{apiError}</span>}
                            </div>

                            <button
                                onClick={handleConfirmAndPay}
                                disabled={isProcessing || !isFormComplete()}
                                className="w-full bg-gray-800 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                aria-describedby={!isFormComplete() && !isProcessing ? "form-incomplete-message" : undefined}
                            >
                                {isProcessing ? (
                                    <>
                                        <LoaderIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
                                        Processing...
                                    </>
                                ) : (
                                    allItems.some(item => item.selectedPaymentStructure === 'SPLIT_PAYMENT') 
                                        ? `Pay Now - €${allItems.reduce((sum, item) => {
                                            const itemTotal = calculateItemTotal(item);
                                            return sum + (item.selectedPaymentStructure === 'SPLIT_PAYMENT' ? itemTotal * 0.3 : itemTotal);
                                        }, 0).toFixed(2)}`
                                        : 'Confirm & pay now'
                                )}
                            </button>
                            
                            {!isFormComplete() && !isProcessing && (
                                <p id="form-incomplete-message" className="text-sm text-gray-500 text-center">
                                    Please complete all required fields to continue
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add these styles to your global CSS or component styles */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                @keyframes slideDown {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}