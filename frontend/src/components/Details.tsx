/* eslint-disable no-useless-escape */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import { baseUrl, nationalities } from "../utils/constants";
import { ChevronDown, ChevronUp, LoaderIcon, Search } from "lucide-react";
import CountryList from 'country-list-with-dial-code-and-flag';

export default function Details({ bookingData, bookingItems, availabilityData }: { bookingData: any, bookingItems: any, availabilityData: any }) {
    // Form states
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        nationality: "",
        specialRequests: ""
    });
    
    // UI states
    const [showNationality, setShowNationality] = useState(false);
    const [nationalitySearch, setNationalitySearch] = useState("");
    const [nationality, setNationality] = useState("");
    const [showCountry, setShowCountry] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const [country, setCountry] = useState("+39");
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [receiveMarketing, setReceiveMarketing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errors, setErrors] = useState<any>({});    
    const countries = CountryList.getAll();
    const [filteredCountries, setFilteredCountries] = useState<any[]>(countries);
    
    useEffect(() => {
       const filteredCountries = countries.filter((country: any) => 
        country.data.name.toLowerCase().includes(countrySearch.toLowerCase())
       );
       setFilteredCountries(filteredCountries);     

    }, [countrySearch]);

    // Filter nationalities based on search
    const filteredNationalities = useMemo(() => {
        if (!nationalitySearch.trim()) return nationalities;
        return nationalities.filter((nat: string) => 
            nat.toLowerCase().includes(nationalitySearch.toLowerCase())
        );
    }, [nationalitySearch]);
    
    // Helper functions from Summary component
    const formatDate = (date: string) => {
        if (!date) return '';
        const d = new Date(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        
        return `${days[d.getDay()]} ${d.getDate().toString().padStart(2, '0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
    };

    const calculateNights = (checkIn: string, checkOut: string) => {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
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
        return Math.round(subtotal * 0.1 / 1.1 * 100) / 100;
    };

    const grandTotal = calculateSubtotal();
    const displayTax = calculateDisplayTax(grandTotal);

    // Validation functions
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string) => {
        // Remove spaces and special characters for validation
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        // Allow 7-15 digits for international numbers
        return /^\d{7,15}$/.test(cleanPhone);
    };

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
        
        if (formData.phone.trim() && !validatePhone(formData.phone)) {
            newErrors.phone = "Please enter a valid phone number (7-15 digits)";
        }
        
        if (!agreeToTerms) {
            newErrors.terms = "You must agree to the terms and conditions";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check if form is complete and valid
    const isFormComplete = () => {
        return (
            formData.firstName.trim().length >= 2 &&
            formData.lastName.trim().length >= 2 &&
            formData.email.trim() &&
            validateEmail(formData.email) &&
            (!formData.phone.trim() || validatePhone(formData.phone)) &&
            agreeToTerms
        );
    };

    // Handle form submission and Stripe checkout
    const handleConfirmAndPay = async () => {
        if (!validateForm()) {
            return;
        }

        setIsProcessing(true);
        try {
            const bookingPayload = {
                customerDetails: {
                    firstName: formData.firstName,
                    middleName: formData.middleName.trim() || null,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: country + formData.phone.trim(),
                    nationality: nationality,
                    specialRequests: formData.specialRequests,
                    receiveMarketing: receiveMarketing
                },
                bookingItems: allItems, // here we need make a copy and remove the unwanted items 
                totalAmount: grandTotal,
                taxAmount: displayTax
            };

            const response = await fetch(baseUrl + "/bookings/create-checkout-session", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();
            if ( response.status === 200 && data.data.url) {
                // Redirect to Stripe checkout
               //window.location.href = data.data.url;
            } else {
                throw new Error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert('There was an error processing your request. Please try again.');
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
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
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
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
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
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div className="text-left">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <div className="flex gap-2">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={country || "+39"} 
                                    onClick={() => setShowCountry(!showCountry)}
                                    className="mt-1 block w-16 sm:w-20 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-2 py-2 outline-none border border-gray-300 cursor-pointer text-center text-xs sm:text-sm"
                                    readOnly
                                />
                                {showCountry && (
                                    <div className="absolute top-12 left-0 w-72 sm:w-80 max-h-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                        <div className="p-3 border-b border-gray-200">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search countries..."
                                                    value={countrySearch}
                                                    onChange={(e) => setCountrySearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-52 overflow-y-auto p-2">
                                            {filteredCountries.map((countryItem: any, index: number) => (
                                                <div 
                                                    key={index} 
                                                    className="hover:bg-gray-100 p-2 rounded-md cursor-pointer flex items-center gap-2" 
                                                    onClick={() => {
                                                        setCountry(countryItem.dial_code);
                                                        setShowCountry(false);
                                                        setCountrySearch("");
                                                    }}
                                                >
                                                    <span className="text-sm font-medium">{countryItem.dial_code}</span>
                                                    <span className="text-sm text-gray-600 truncate">{countryItem.name}</span>
                                                </div>
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
                            <input 
                                type="tel" 
                                id="phone" 
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className={`mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
                                placeholder="Phone number"
                            />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div className="text-left relative">
                        <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Nationality</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                id="nationality" 
                                value={nationality} 
                                onClick={() => setShowNationality(!showNationality)}
                                className="mt-1 block w-full rounded-md shadow-sm focus:border-gray-500 cursor-pointer focus:ring-gray-500 sm:text-sm px-4 py-2 outline-none border border-gray-300" 
                                placeholder="Select nationality"
                                readOnly
                            />
                            <div className="absolute right-3 top-3 pointer-events-none">
                                {showNationality ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                            {showNationality && (
                                <div className="absolute top-12 left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                    <div className="p-3 border-b border-gray-200">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search nationality..."
                                                value={nationalitySearch}
                                                onChange={(e) => setNationalitySearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto p-2">
                                        {filteredNationalities.map((nat: string) => (
                                            <div 
                                                key={nat} 
                                                className="hover:bg-gray-100 p-2 rounded-md cursor-pointer" 
                                                onClick={() => {
                                                    setNationality(nat);
                                                    setShowNationality(false);
                                                    setNationalitySearch("");
                                                }}
                                            >
                                                {nat}
                                            </div>
                                        ))}
                                        {filteredNationalities.length === 0 && (
                                            <div className="p-2 text-sm text-gray-500 text-center">
                                                No nationalities found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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
                                            <span className="flex-1 pr-2">{item.selectedRateOption?.name || 'Standard Rate'} ({nights} × {rooms} × €{item.selectedRateOption?.price || 0})</span>
                                            <span className="font-medium">€{roomBasePrice.toFixed(2)}</span>
                                        </div>
                                        
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
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                            <span className="text-gray-700">IVA 10%</span>
                            <div className="text-right">
                                <div className="font-medium">€{displayTax.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">Taxes included in price</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-300 mt-4">
                            <span className="text-lg sm:text-xl font-semibold">Total</span>
                            <span className="text-lg sm:text-xl font-semibold">€{grandTotal.toFixed(2)}</span>
                        </div>

                        <div className="text-sm text-gray-500 text-right mt-2">
                            You'll pay when you finish your reservation.
                        </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="agreeTerms"
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500 flex-shrink-0"
                            />
                            <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                                I agree to{" "}
                                <a href="https://www.latorre.farm/terms" target="_blank" className="text-gray-800 underline hover:no-underline">
                                    Property T&C
                                </a>{" "}
                                and{" "}
                                <a href="https://www.latorre.farm/privacy" target="_blank" className="text-gray-800 underline hover:no-underline">
                                    Property Privacy Policy
                                </a>
                                . <span className="text-red-500">*</span>
                            </label>
                        </div>
                        {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}

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

                        <button
                            onClick={handleConfirmAndPay}
                            disabled={isProcessing || !isFormComplete()}
                            className="w-full bg-gray-800 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Confirm & pay now'
                            )}
                        </button>
                        
                        {!isFormComplete() && !isProcessing && (
                            <p className="text-sm text-gray-500 text-center">
                                Please complete all required fields to continue
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}