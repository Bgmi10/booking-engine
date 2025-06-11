import { useState, useEffect } from "react"
import { RiCloseLine, RiCheckLine, RiErrorWarningLine, RiAddLine, RiSubtractLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { baseUrl } from "../../../utils/constants"
import countryList from "country-list-with-dial-code-and-flag"
import type { Enhancement, Room } from "../../../types/types"
import { addDays, differenceInHours } from "date-fns"

interface BookingItem {
  checkIn: string
  checkOut: string
  selectedRoom: string
  rooms: number
  adults: number
  selectedEnhancements: Enhancement[]
  roomDetails?: Room
  error?: string
  selectedRateOption?: any
  totalPrice?: number
}

interface CustomerDetails {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  specialRequests: string
}

interface CreateBookingModalProps {
  setIsCreateModalOpen: (isOpen: boolean) => void
}

export function CreateBookingModal({
  setIsCreateModalOpen,
  taxPercentage = 0.1 // Default to 10% if not provided
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
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)

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
      setLocalError("Failed to load rooms. Please try again.")
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

  useEffect(() => {
    (async () => {
      await Promise.all([fetchRooms(), fetchAllEnhancements()])
    })();
  }, [])

  // Set default dates
  useEffect(() => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    setBookingItems((prev) =>
      prev.map((item) => ({
        ...item,
        checkIn: today.toISOString().split("T")[0],
        checkOut: tomorrow.toISOString().split("T")[0],
      })),
    )
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
      setLocalError(validation.error);
    }
    setBookingItems(validation.updatedItems);
    return;
  }

  // Clear any previous errors
  setLocalError("");
  
  // Calculate hours until expiry
  const finalExpiryHours =
    expiryMode === "hours" ? expiresInHours : Math.max(1, differenceInHours(expiryDate, new Date()));

  setLoadingAction(true);
  setLocalSuccess("");

  try {
    const res = await fetch(`${baseUrl}/admin/create-payment-link`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingItems: bookingItems.map((item) => ({
          ...item,
          fromAdmin: true,
        })),
        customerDetails,
        taxAmount,
        totalAmount,
        expiresInHours: finalExpiryHours,
        adminNotes: customerDetails.specialRequests,
      }),
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
        setLocalError(data.message || "Failed to create booking");
      }
      throw new Error(data.message || "Failed to create booking");
    }

    setLocalSuccess("Payment link created successfully!");
  } catch (error: any) {
    console.error(error);
    if (!error.message.includes("is not available for these dates")) {
      setLocalError(error.message || "Failed to create booking. Please try again.");
    }
  } finally {
    setLoadingAction(false);
  }
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
          {localError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{localError}</p>
                </div>
              </div>
            </div>
          )}

          {localSuccess && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiCheckLine className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{localSuccess}</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Details Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={customerDetails.firstName}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={customerDetails.middleName}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, middleName: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={customerDetails.lastName}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, email: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                <select
                  value={customerDetails.nationality}
                  onChange={(e) => handleNationalityChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction}
                >
                  <option value="">Select nationality</option>
                  {countries.map((country, index) => (
                    <option key={index} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, phone: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={customerDetails.specialRequests}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, specialRequests: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  disabled={loadingAction}
                />
              </div>
            </div>
          </div>

          {/* Booking Items Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Booking Details</h4>
              <button
                onClick={addBookingItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                disabled={loadingAction}
              >
                <RiAddLine className="mr-1" />
                Add Room
              </button>
            </div>

            {bookingItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-md font-medium text-gray-900">Room {index + 1}</h5>
                  {bookingItems.length > 1 && (
                    <button
                      onClick={() => removeBookingItem(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={loadingAction}
                    >
                      <RiSubtractLine size={20} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
                    {loadingRooms ? (
                      <div className="flex items-center space-x-2">
                        <BiLoader className="animate-spin text-indigo-600" />
                        <span className="text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : (
                      <select
                        value={item.selectedRoom}
                        onChange={(e) => updateBookingItem(index, "selectedRoom", e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        disabled={loadingAction}
                      >
                        <option value="">Select room</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} - €{room.price}/night (Cap: {room.capacity})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adults {item.roomDetails && `(Max: ${item.roomDetails.capacity * item.rooms})`}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={item.roomDetails ? item.roomDetails.capacity * item.rooms : undefined}
                      value={item.adults}
                      onChange={(e) => updateBookingItem(index, "adults", Number.parseInt(e.target.value) || 1)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      disabled={loadingAction}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date *</label>
                    <DatePicker
                      selected={item.checkIn ? new Date(item.checkIn) : null}
                      onChange={(date: Date | null) =>
                        updateBookingItem(index, "checkIn", date ? date.toISOString().split("T")[0] : "")
                      }
                      dateFormat="dd/MM/yyyy"
                      className={`block w-full px-3 py-2 border ${
                        item.error
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                      } rounded-md shadow-sm focus:outline-none sm:text-sm`}
                      disabled={loadingAction}
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label>
                    <DatePicker
                      selected={item.checkOut ? new Date(item.checkOut) : null}
                      onChange={(date: Date | null) =>
                        updateBookingItem(index, "checkOut", date ? date.toISOString().split("T")[0] : "")
                      }
                      dateFormat="dd/MM/yyyy"
                      className={`block w-full px-3 py-2 border ${
                        item.error
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                      } rounded-md shadow-sm focus:outline-none sm:text-sm`}
                      disabled={loadingAction}
                    />
                  </div>
                </div>
                {item.error && (
                  <div className="mt-1 mb-4">
                    <p className="text-sm text-red-600">{item.error}</p>
                  </div>
                )}

                {/* Enhancements Section */}
                {enhancements.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enhancements</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {enhancements.map((enhancement) => (
                        <label
                          key={enhancement.id}
                          className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={item.selectedEnhancements.some((e) => e.id === enhancement.id)}
                            onChange={() => toggleEnhancement(index, enhancement)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                            disabled={loadingAction}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{enhancement.title}</div>
                            <div className="text-sm text-gray-500">
                              €{enhancement.price} {enhancement.pricingType.toLowerCase().replace("_", " ")}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{enhancement.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rate Options Section */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate Options</label>
                  <div className="space-y-3">
                    {item.roomDetails &&
                      getRateOptions(item.roomDetails).map((rateOption: any) => {
                        const hasDiscount = rateOption.discountPercentage > 0
                        const isSelected = item.selectedRateOption?.id === rateOption.id
                        const checkInDate = new Date(item.checkIn)
                        const checkOutDate = new Date(item.checkOut)
                        const nights = Math.ceil(
                          (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
                        )
                        const totalPrice = rateOption.price * nights * item.rooms

                        return (
                          <div
                            key={rateOption.id}
                            className={`border rounded-lg overflow-hidden ${
                              isSelected
                                ? "border-indigo-500 ring-1 ring-indigo-500"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {/* Rate Header */}
                            <div
                              className={`p-3 ${rateOption.type === "special" && hasDiscount ? "bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200" : "bg-gray-50 border-b border-gray-200"}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {hasDiscount && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 text-orange-600"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                    </svg>
                                  )}
                                  <h4
                                    className={`font-medium text-sm ${hasDiscount ? "text-orange-800" : "text-gray-800"}`}
                                  >
                                    {rateOption.name}
                                  </h4>
                                </div>
                                <div className="flex gap-2">
                                  {hasDiscount && (
                                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                      -{rateOption.discountPercentage}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className={`text-xs ${hasDiscount ? "text-orange-700" : "text-gray-600"}`}>
                                {rateOption.description}
                              </p>
                            </div>

                            {/* Rate Body */}
                            <div className="p-3">
                              {/* Pricing Display */}
                              <div className="space-y-2 mb-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-800">
                                    €{rateOption.price.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-600">per night</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-gray-700 border-t pt-2">
                                  <span>Total ({nights} nights):</span>
                                  <span className="font-bold text-gray-900">€{totalPrice.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Policy Information */}
                              <div className="space-y-1 mb-3 text-xs">
                                <div className="flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 text-gray-600"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                  </svg>
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-medium ${rateOption.refundable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                                  >
                                    {rateOption.refundable ? "Refundable" : "Non-refundable"}
                                  </span>
                                </div>
                              </div>

                              {/* Select Button */}
                              <button
                                type="button"
                                className={`w-full py-1.5 rounded font-medium transition-colors text-xs ${
                                  isSelected
                                    ? "bg-indigo-600 text-white"
                                    : hasDiscount
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                }`}
                                onClick={() => selectRateOption(index, rateOption)}
                              >
                                {isSelected ? "Selected" : "Select Rate"}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Amount Display */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>Subtotal:</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <span>Tax (10% IVA) included in price:</span>
              <span>€{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-semibold text-gray-900 border-t pt-2">
              <span>Total:</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-10 -mt-10">
          <div className="mb-4">
            <div className="flex border-b border-gray-200">
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  expiryMode === "hours"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setExpiryMode("hours")}
                disabled={loadingAction}
              >
                Hours
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  expiryMode === "date"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setExpiryMode("date")}
                disabled={loadingAction}
              >
                Specific Date
              </button>
            </div>
          </div>

          {expiryMode === "hours" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Link Expiration Time (Hours)
              </label>
              <input
                type="number"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Math.max(1, Number.parseInt(e.target.value)))}
                min="1"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loadingAction}
              />
              <p className="mt-1 text-sm text-gray-500">
                Link will expire in {expiresInHours} hours ({Math.floor(expiresInHours / 24)} days and{" "}
                {expiresInHours % 24} hours)
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Link Expiration Date</label>
              <DatePicker
                selected={expiryDate}
                onChange={(date: Date | null) => date && setExpiryDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={30}
                dateFormat="MMMM d, yyyy h:mm aa"
                minDate={new Date()}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loadingAction}
              />
              <p className="mt-1 text-sm text-gray-500">
                Link will expire on the selected date and time ({Math.floor(differenceInHours(expiryDate, new Date()))}{" "}
                hours from now)
              </p>
            </div>
          )}
        </div>

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
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            onClick={createBooking}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Creating Payment Link...
              </span>
            ) : (
              "Create Payment Link"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
