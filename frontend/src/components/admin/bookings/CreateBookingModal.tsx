import React, { useState, useEffect } from "react"
import { RiCloseLine, RiCheckLine, RiErrorWarningLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import "react-datepicker/dist/react-datepicker.css"
import { baseUrl } from "../../../utils/constants"
import countryList from "country-list-with-dial-code-and-flag"
import type { Room, Enhancement, CustomerDetails, BookingItem, BankDetails, PaymentMethod } from "../../../types/types"
import { addDays, differenceInHours } from "date-fns"
import CustomerDetailsForm from "./CustomerDetailsForm"
import BookingItemsList from "./BookingItemsList"
import TotalAmountSummary from "./TotalAmountSummary"
import ExpirySelector from "./ExpirySelector"
import SelectCustomerModal from "./SelectCustomerModal"
import DateSelector from "../../DateSelector";
import toast from 'react-hot-toast';

interface CreateBookingModalProps {
  setIsCreateModalOpen: (isOpen: boolean) => void
  fetchBookings: any
}

export function CreateBookingModal({
  setIsCreateModalOpen,
  taxPercentage = 0.1, 
  fetchBookings
}: CreateBookingModalProps & { taxPercentage?: number }) {
  const countries = countryList.getAll()

  // Customer Details State
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    specialRequests: "",
  })

  const [expiryMode, setExpiryMode] = useState<"hours" | "date">("hours")
  const [expiresInHours, setExpiresInHours] = useState(72)
  const [expiryDate, setExpiryDate] = useState<Date>(addDays(new Date(), 3))

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('STRIPE')
  const [bankDetails, setBankDetails] = useState<BankDetails[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [loadingBankDetails, setLoadingBankDetails] = useState(false)

  // Booking Items State
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([
    {
      checkIn: "",
      checkOut: "",
      selectedRoom: "",
      rooms: 1,
      adults: 1,
      selectedEnhancements: [],
      selectedRateOption: {},
      totalPrice: 0,
    },
  ])

  const [loadingAction, setLoadingAction] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)
  const [isSelectCustomerModalOpen, setIsSelectCustomerModalOpen] = useState(false)
  // Add admin notes state
  const [adminNotes, setAdminNotes] = useState("");

  // Add state for calendar and availability
  const [calenderOpen, setCalenderOpen] = useState(false);
  const [availabilityData, setAvailabilityData] = useState({
    fullyBookedDates: [],
    partiallyBookedDates: [],
    availableDates: [],
    minStayDays: 0,
    taxPercentage: 0.1,
    restrictedDates: [],
    dateRestrictions: {}
  });
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Fetch availability data for calendar
  const fetchCalendarAvailability = async (startDate: string, endDate: string) => {
    setIsLoadingAvailability(true);
    try {
      const response = await fetch(
        `${baseUrl}/rooms/availability/calendar?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      const result = await response.json();
      if (result.data) {
        setAvailabilityData(prev => ({
          ...prev,
          ...result.data,
          minStayDays: result.data.generalSettings?.[0]?.minStayDays || 2,
          taxPercentage: result.data.generalSettings?.[0]?.taxPercentage || 0.1,
        }));
      }
    } catch (e) {
      setAvailabilityData({
        fullyBookedDates: [],
        partiallyBookedDates: [],
        availableDates: [],
        minStayDays: 0,
        taxPercentage: 0.1,
        restrictedDates: [],
        dateRestrictions: {}
      });
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Open calendar and fetch availability for next 2 months
  const handleOpenCalendar = () => {
    setCalenderOpen(true);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const formatDateForAPI = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    fetchCalendarAvailability(formatDateForAPI(startOfMonth), formatDateForAPI(endOfMonth));
  };

  // Date selection handler for booking item 0 (single booking flow)
  const handleDateSelect = ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
    setBookingItems(prev => prev.map((item, idx) => idx === 0 ? {
      ...item,
      checkIn: startDate ? startDate.toISOString().split("T")[0] : "",
      checkOut: endDate ? endDate.toISOString().split("T")[0] : "",
    } : item));
  };

  // Handle nationality change and update phone code
  const handleNationalityChange = (countryCode: string) => {
    setCustomerDetails((prev) => ({
      ...prev,
      nationality: countryCode,
    }))
    const country = countries.find((c) => c.code === countryCode)
    if (country) {
      setCustomerDetails((prev) => ({
        ...prev,
        phone: country.dial_code,
      }))
    }
  }

  // Fetch available rooms
  const fetchRooms = async () => {
    setLoadingRooms(true)
    try {
      const res = await fetch(`${baseUrl}/admin/rooms/all`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch rooms")
      }

      const data = await res.json()
      setRooms(data.data)

      if (data.data.length > 0) {
        setBookingItems((prev) =>
          prev.map((item, index) =>
            index === 0
              ? { ...item, selectedRoom: data.data[0].id, roomDetails: data.data[0], totalPrice: data.data[0].price }
              : item,
          ),
        )
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load rooms. Please try again.")
    } finally {
      setLoadingRooms(false)
    }
  }

  const fetchAllEnhancements = async () => {
    try {
      const res = await fetch(baseUrl + "/admin/enhancements/all", {
        credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (res.status === 200) {
        const data = await res.json()
        setEnhancements(data.data)
      }
    } catch (e) {
      console.log(e)
    }
  }

  // Fetch bank details for bank transfer option
  const fetchBankDetails = async () => {
    setLoadingBankDetails(true)
    try {
      const response = await fetch(`${baseUrl}/admin/bank-details/all`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const activeBanks = (data.data || []).filter((bank: BankDetails) => bank.isActive);
        setBankDetails(activeBanks);
        if (activeBanks.length > 0) {
          setSelectedBankId(activeBanks[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bank details:', error);
    } finally {
      setLoadingBankDetails(false);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchRooms(), fetchAllEnhancements(), fetchBankDetails()])
    })();
  }, [])

  // Calculate total amount
  useEffect(() => {
    let total = 0

    bookingItems.forEach((item) => {
      if (item.checkIn && item.checkOut && item.roomDetails) {
        const checkInDate = new Date(item.checkIn)
        const checkOutDate = new Date(item.checkOut)
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

        // Room cost based on selected rate option or default room price
        const roomPrice = item.selectedRateOption?.price || item.roomDetails.price
        const roomCost = roomPrice * nights * item.rooms
        total += roomCost

        // Enhancement costs
        item.selectedEnhancements.forEach((enhancement) => {
          let enhancementCost = 0
          switch (enhancement.pricingType) {
            case "PER_GUEST":
              enhancementCost = enhancement.price * item.adults * item.rooms
              break
            case "PER_BOOKING":
              enhancementCost = enhancement.price * item.rooms
              break
            case "PER_DAY":
              enhancementCost = enhancement.price * nights * item.rooms
              break
            default:
              enhancementCost = enhancement.price
          }
          total += enhancementCost
        })
      }
    })

    const tax = total * taxPercentage
    setTotalAmount(total)
    setTaxAmount(tax)
  }, [bookingItems, taxPercentage])

  // Add new booking item
  const addBookingItem = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    setBookingItems((prev) => [
      ...prev,
      {
        checkIn: today.toISOString().split("T")[0],
        checkOut: tomorrow.toISOString().split("T")[0],
        selectedRoom: rooms.length > 0 ? rooms[0].id : "",
        rooms: 1,
        adults: 1,
        selectedEnhancements: [],
        roomDetails: rooms.length > 0 ? rooms[0] : undefined,
        selectedRateOption: {},
        totalPrice: rooms.length > 0 ? rooms[0].price : 0,
      },
    ])
  }

  // Remove booking item
  const removeBookingItem = (index: number) => {
    if (bookingItems.length > 1) {
      setBookingItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // Update booking item
  const updateBookingItem = (index: number, field: keyof BookingItem, value: any) => {
    setBookingItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }

          // If room is changed, update room details and reset enhancements
          if (field === "selectedRoom") {
            const roomDetails = rooms.find((r) => r.id === value)
            updatedItem.roomDetails = roomDetails
            updatedItem.selectedEnhancements = []
            updatedItem.selectedRateOption = {} // Reset rate option when room changes
            // Ensure adults don't exceed room capacity
            if (roomDetails && updatedItem.adults > roomDetails.capacity) {
              updatedItem.adults = roomDetails.capacity
            }
          }

          // Ensure adults don't exceed room capacity
          if (field === "adults" && updatedItem.roomDetails) {
            const maxAdults = updatedItem.roomDetails.capacity * updatedItem.rooms
            if (value > maxAdults) {
              updatedItem.adults = maxAdults
            }
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  // Toggle enhancement selection
  const toggleEnhancement = (bookingIndex: number, enhancement: Enhancement) => {
    setBookingItems((prev) =>
      prev.map((item, i) => {
        if (i === bookingIndex) {
          const isSelected = item.selectedEnhancements.some((e) => e.id === enhancement.id)
          const selectedEnhancements = isSelected
            ? item.selectedEnhancements.filter((e) => e.id !== enhancement.id)
            : [...item.selectedEnhancements, enhancement]

          return { ...item, selectedEnhancements }
        }
        return item
      }),
    )
  }

  // Get rate options for a room
  const getRateOptions = (room: Room) => {
    const options = []

    // Base rate (always available)
    const basePrice = room?.price || 0
    options.push({
      id: "base",
      name: "Standard Rate",
      description: "Our standard room rate with all basic amenities included",
      price: basePrice,
      discountPercentage: 0,
      isActive: true,
      refundable: true,
      type: "base",
    })

    // Room rates (if available)
    //@ts-ignore
    if (room?.RoomRate && room.RoomRate.length > 0) {
      //@ts-ignore
      room.RoomRate.forEach((roomRate: any) => {
        if (roomRate.ratePolicy.isActive) {
          let finalPrice = basePrice

          // Apply discount if available
          if (roomRate.ratePolicy.discountPercentage) {
            finalPrice = basePrice * (1 - roomRate.ratePolicy.discountPercentage / 100)
          }

          // Use nightly rate if specified
          if (roomRate.ratePolicy.nightlyRate) {
            finalPrice = roomRate.ratePolicy.nightlyRate
          }

          options.push({
            id: roomRate.ratePolicy.id,
            name: roomRate.ratePolicy.name,
            description: roomRate.ratePolicy.description,
            price: finalPrice,
            discountPercentage: roomRate.ratePolicy.discountPercentage || 0,
            isActive: roomRate.ratePolicy.isActive,
            refundable: roomRate.ratePolicy.refundable,
            fullPaymentDays: roomRate.ratePolicy.fullPaymentDays,
            prepayPercentage: roomRate.ratePolicy.prepayPercentage,
            changeAllowedDays: roomRate.ratePolicy.changeAllowedDays,
            rebookValidityDays: roomRate.ratePolicy.rebookValidityDays,
            type: "special",
          })
        }
      })
    }

    return options
  }

  // Select rate option for a booking item
  const selectRateOption = (bookingIndex: number, rateOption: any) => {
    setBookingItems((prev) =>
      prev.map((item, i) => {
        if (i === bookingIndex) {
          // Calculate nights
          const checkInDate = new Date(item.checkIn)
          const checkOutDate = new Date(item.checkOut)
          const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

          // Calculate enhancement costs
          let enhancementCost = 0
          item.selectedEnhancements.forEach((enhancement) => {
            switch (enhancement.pricingType) {
              case "PER_GUEST":
                enhancementCost += enhancement.price * item.adults * item.rooms
                break
              case "PER_BOOKING":
                enhancementCost += enhancement.price * item.rooms
                break
              case "PER_DAY":
                enhancementCost += enhancement.price * nights * item.rooms
                break
              default:
                enhancementCost += enhancement.price
            }
          })

          // Calculate total price
          const totalPrice = rateOption.price * nights * item.rooms + enhancementCost

          return {
            ...item,
            selectedRateOption: rateOption,
            totalPrice: totalPrice,
          }
        }
        return item
      }),
    )
  }

  // Helper function to extract room name from error message
  const extractRoomAndError = (errorMessage: string) => {
    const match = errorMessage.match(/(.*?) is not available for these dates/)
    return match ? match[1] : null
  } 

  // Helper function to check if two date ranges overlap
const checkDateRangeOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  const startDate1 = new Date(start1);
  const endDate1 = new Date(end1);
  const startDate2 = new Date(start2);
  const endDate2 = new Date(end2);
  
  // Check if ranges overlap
  return startDate1 < endDate2 && startDate2 < endDate1;
};

// Function to validate booking items for room conflicts
const validateBookingItems = (bookingItems: BookingItem[]) => {
  const errors = [];
  
  for (let i = 0; i < bookingItems.length; i++) {
    const currentItem = bookingItems[i];
    
    // Skip if current item doesn't have required fields
    if (!currentItem.selectedRoom || !currentItem.checkIn || !currentItem.checkOut) {
      continue;
    }
    
    // Check against all other booking items
    for (let j = i + 1; j < bookingItems.length; j++) {
      const compareItem = bookingItems[j];
      
      // Skip if compare item doesn't have required fields
      if (!compareItem.selectedRoom || !compareItem.checkIn || !compareItem.checkOut) {
        continue;
      }
      
      // Check if same room and dates overlap
      if (currentItem.selectedRoom === compareItem.selectedRoom) {
        const hasOverlap = checkDateRangeOverlap(
          currentItem.checkIn,
          currentItem.checkOut,
          compareItem.checkIn,
          compareItem.checkOut
        );
        
        if (hasOverlap) {
          const roomName = currentItem.roomDetails?.name || `Room ${currentItem.selectedRoom}`;
          const errorMessage = `${roomName} has conflicting dates between Room ${i + 1} and Room ${j + 1}`;
          
          errors.push({
            indices: [i, j],
            message: errorMessage,
            roomId: currentItem.selectedRoom
          });
        }
      }
    }
  }
  
  return errors;
};

  // Validation function for booking items
const validateBeforeBooking = (bookingItems: BookingItem[] , customerDetails: CustomerDetails) => {
  // Reset all errors first
  const itemsWithClearedErrors = bookingItems.map(item => ({ ...item, error: undefined }));
  
  // Basic validation
  if (!customerDetails.firstName.trim() || !customerDetails.lastName.trim() || !customerDetails.email.trim()) {
    return {
      isValid: false,
      error: "Customer first name, last name, and email are required",
      updatedItems: itemsWithClearedErrors
    };
  }
  
  // Validate each booking item
  for (let i = 0; i < bookingItems.length; i++) {
    const item = bookingItems[i];
    if (!item.selectedRoom) {
      return {
        isValid: false,
        error: `Room selection is required for booking item ${i + 1}`,
        updatedItems: itemsWithClearedErrors
      };
    }
    if (!item.checkIn || !item.checkOut) {
      return {
        isValid: false,
        error: `Check-in and check-out dates are required for booking item ${i + 1}`,
        updatedItems: itemsWithClearedErrors
      };
    }
    if (new Date(item.checkIn) >= new Date(item.checkOut)) {
      const updatedItems = itemsWithClearedErrors.map((bItem, index) =>
        index === i ? { ...bItem, error: "Check-out date must be after check-in date" } : bItem
      );
      return {
        isValid: false,
        error: null, // Error is set on specific item
        updatedItems
      };
    }
    if (!item.selectedRateOption || !item.selectedRateOption.id) {
      return {
        isValid: false,
        error: `Rate option selection is required for booking item ${i + 1}`,
        updatedItems: itemsWithClearedErrors
      };
    }
  }
  
  // Check for room conflicts
  const conflicts = validateBookingItems(bookingItems);

  if (conflicts.length > 0) {
    const updatedItems = itemsWithClearedErrors.map((item, i) => {
      const conflict = conflicts.find(c => c.indices.includes(i));
      if (conflict) {
        return { ...item, error: conflict.message };
      }
      return item;
    });
    
    return {
      isValid: false,
      error: "Please resolve room booking conflicts before proceeding",
      updatedItems
    };
  }
  
  return {
    isValid: true,
    error: null,
    updatedItems: itemsWithClearedErrors
  };
};


  // Create booking
const createBooking = async () => {
  // Validate before proceeding
  const validation = validateBeforeBooking(bookingItems, customerDetails);
  
  if (!validation.isValid) {
    if (validation.error) {
      toast.error(validation.error);
    }
    setBookingItems(validation.updatedItems);
    return;
  }

  // Validate bank transfer selection
  if (paymentMethod === 'BANK_TRANSFER' && !selectedBankId) {
    toast.error("Please select a bank account for bank transfer");
    return;
  }

  // Clear any previous errors
  setBookingItems(validation.updatedItems); // Ensure items are updated with errors

  // Calculate hours until expiry
  const finalExpiryHours =
    expiryMode === "hours" ? expiresInHours : Math.max(1, differenceInHours(expiryDate, new Date()));

  setLoadingAction(true);

  try {
    let endpoint = '';
    let requestBody: any = {
      bookingItems: bookingItems.map((item) => ({
        ...item,
        fromAdmin: true,
      })),
      customerDetails,
      taxAmount,
      totalAmount,
      customerRequest: customerDetails.specialRequests,
      adminNotes, // <-- add adminNotes to request body
    };

    // Set endpoint and additional data based on payment method
    switch (paymentMethod) {
      case 'STRIPE':
        endpoint = `${baseUrl}/admin/bookings/create-payment-link`;
        requestBody.expiresInHours = finalExpiryHours;
        requestBody.adminNotes = adminNotes;
        requestBody.bankDetailsId = selectedBankId;
        break;
      case 'CASH':
        endpoint = `${baseUrl}/admin/bookings/collect-cash`;
        requestBody.expiresInHours = finalExpiryHours;
        requestBody.adminNotes = adminNotes;
        break;
      case 'BANK_TRANSFER':
        endpoint = `${baseUrl}/admin/bookings/bank-transfer`;
        requestBody.bankDetailsId = selectedBankId;
        requestBody.expiresInHours = finalExpiryHours;
        requestBody.adminNotes = adminNotes;
        break;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (!res.ok) {
      // Check if error is about room availability
      const roomName = extractRoomAndError(data.message);
      if (roomName) {
        // Find the booking item with this room and set its error
        setBookingItems((prev) =>
          prev.map((item) => (item.roomDetails?.name === roomName ? { ...item, error: data.message } : item)),
        );
      } else {
        toast.error(data.message || "Failed to create booking");
      }
      throw new Error(data.message || "Failed to create booking");
    }

    let successMessage = "";
    switch (paymentMethod) {
      case 'STRIPE':
        successMessage = "Payment link created successfully!";
        break;
      case 'CASH':
        successMessage = "Cash payment intent created! Admin needs to confirm after cash collection.";
        break;
      case 'BANK_TRANSFER':
        successMessage = "Bank transfer instructions sent to customer! Admin needs to confirm after payment verification.";
        break;
    }

    toast.success(successMessage);
    setTimeout(() => {
      fetchBookings();  
      setIsCreateModalOpen(false);
    }, 500);
  } catch (error: any) {
    console.error(error);
    if (!error.message.includes("is not available for these dates")) {
      toast.error(error.message || "Failed to create booking. Please try again.");
    }
  } finally {
    setLoadingAction(false);
  }
};

  // Handler to fill customer details from selected customer
  const handleSelectCustomer = (customer: any) => {
    setCustomerDetails(prev => ({
      ...prev,
      firstName: customer.guestFirstName || "",
      middleName: customer.guestMiddleName || "",
      lastName: customer.guestLastName || "",
      email: customer.guestEmail || "",
      phone: customer.guestPhone || "",
      nationality: customer.guestNationality || "",
      // specialRequests: keep as is
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">Create New Booking</h3>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={loadingAction}
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">

          {/* Select Existing Customer Button */}
          <div className="mb-4">
            <button
              type="button"
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md shadow-sm text-sm font-medium bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setIsSelectCustomerModalOpen(true)}
              disabled={loadingAction}
            >
              Select Existing Customer
            </button>
          </div>

          {/* Customer Details Section */}
          <CustomerDetailsForm
            customerDetails={customerDetails}
            setCustomerDetails={setCustomerDetails}
            countries={countries}
            loadingAction={loadingAction}
            handleNationalityChange={handleNationalityChange}
            showNotesField={false} // Only show for Stripe
          />

          {/* Select Customer Modal */}
          <SelectCustomerModal
            isOpen={isSelectCustomerModalOpen}
            onClose={() => setIsSelectCustomerModalOpen(false)}
            onSelect={handleSelectCustomer}
          />

       

          {/* Booking Items Section */}
          <BookingItemsList
            bookingItems={bookingItems}
            rooms={rooms}
            enhancements={enhancements}
            loadingAction={loadingAction}
            loadingRooms={loadingRooms}
            updateBookingItem={updateBookingItem}
            removeBookingItem={removeBookingItem}
            toggleEnhancement={toggleEnhancement}
            getRateOptions={getRateOptions}
            selectRateOption={selectRateOption}
            addBookingItem={addBookingItem}
            availabilityData={availabilityData}
            isLoadingAvailability={isLoadingAvailability}
            fetchCalendarAvailability={fetchCalendarAvailability}
          />

          {/* Total Amount Display */}
          <TotalAmountSummary
            totalAmount={totalAmount}
            taxAmount={taxAmount}
            taxPercentage={taxPercentage}
          />

          {/* Payment Method Selection */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('STRIPE')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'STRIPE'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💳</div>
                  <div className="font-medium text-gray-900">Stripe Payment</div>
                  <div className="text-sm text-gray-500">Send payment link to customer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💵</div>
                  <div className="font-medium text-gray-900">Cash Payment</div>
                  <div className="text-sm text-gray-500">Collect cash manually</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🏦</div>
                  <div className="font-medium text-gray-900">Bank Transfer</div>
                  <div className="text-sm text-gray-500">Send bank details to customer</div>
                </div>
              </button>
            </div>

            {/* Bank Selection for Bank Transfer */}
            {(paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'STRIPE') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Bank Account
                </label>
                {loadingBankDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : bankDetails.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No active bank accounts found. Please add bank accounts in Settings.
                  </div>
                ) : (
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {bankDetails.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} - {bank.bankName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Customer Request (Special Requests) - only for STRIPE */}
          {paymentMethod === 'STRIPE' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Request (Special Requests)</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                value={customerDetails.specialRequests}
                onChange={e => setCustomerDetails({ ...customerDetails, specialRequests: e.target.value })}
                rows={2}
                placeholder="Add any special requests from the customer (shown to customer in confirmation)"
              />
            </div>
          )}

          {/* Admin Notes Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (internal only)</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Add any internal notes for this booking (not shown to customer)"
            />
          </div>
        </div>

        {/* Expiry Selector - Show for all payment methods */}
        <ExpirySelector
          expiryMode={expiryMode}
          setExpiryMode={setExpiryMode}
          expiresInHours={expiresInHours}
          setExpiresInHours={setExpiresInHours}
          expiryDate={expiryDate}
          setExpiryDate={setExpiryDate}
          loadingAction={loadingAction}
        />

        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg sticky bottom-0">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsCreateModalOpen(false)}
            disabled={loadingAction}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={createBooking}
            disabled={loadingAction || (paymentMethod === 'BANK_TRANSFER' && !selectedBankId)}
          >
            {loadingAction ? (
              <>
                <BiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Creating...
              </>
            ) : (
              `Create ${paymentMethod === 'STRIPE' ? 'Payment Link' : paymentMethod === 'CASH' ? 'Cash Booking' : 'Bank Transfer'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
