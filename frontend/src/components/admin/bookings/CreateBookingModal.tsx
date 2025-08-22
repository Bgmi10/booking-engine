import { useState, useEffect } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import "react-datepicker/dist/react-datepicker.css"
import { baseUrl } from "../../../utils/constants"
import { useCalendarAvailability } from "../../../hooks/useCalendarAvailability"
import countryList from "country-list-with-dial-code-and-flag"
import type { Room, Enhancement, CustomerDetails, BookingItem, BankDetails, PaymentMethod } from "../../../types/types"
import { addDays, differenceInHours } from "date-fns"
import CustomerDetailsForm from "./CustomerDetailsForm"
import BookingItemsList from "./BookingItemsList"
import TotalAmountSummary from "./TotalAmountSummary"
import ExpirySelector from "./ExpirySelector"
import SelectCustomerModal from "./SelectCustomerModal"
import toast from 'react-hot-toast';
import { calculatePriceBreakdown } from "../../../utils/ratePricing";
import { useActiveRatePolicies } from "../../../hooks/useRatePolicies";
import { useRooms } from "../../../hooks/useRooms";
import { useFetchBankDetails } from "../../../hooks/useFetchBankDetails"

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
  const { bankDetails, loader } = useFetchBankDetails();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('STRIPE')
  const [selectedBankId, setSelectedBankId] = useState<string>('')
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
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [taxAmount, setTaxAmount] = useState(0)
  const [isSelectCustomerModalOpen, setIsSelectCustomerModalOpen] = useState(false)
  // Add admin notes state
  const [adminNotes, setAdminNotes] = useState("");
  // State for send confirmation email checkbox
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(false);

  const [availabilityData, setAvailabilityData] = useState({
    fullyBookedDates: [],
    partiallyBookedDates: [],
    availableDates: [],
    minStayDays: 0,
    taxPercentage: 0.1,
    restrictedDates: [],
    dateRestrictions: {}
  });
  // Use the centralized calendar availability hook
  const { fetchCalendarAvailability: fetchCalendarAvailabilityHook, loading: isLoadingAvailability } = useCalendarAvailability();
  
  // Use rate policies hook for admin access to all rate policies
  const { ratePolicies } = useActiveRatePolicies();
  
  // Use rooms hook with callback to set first room as default
  const { 
    rooms, 
    loadingRooms, 
    ratePoliciesWithPricing, 
    fetchRoomsAndPricing, 
    refreshRatePricingForDates: refreshRatePolicingForDates 
  } = useRooms({
    onRoomsLoad: (roomsData) => {
      if (roomsData.length > 0) {
        setBookingItems((prev) =>
          prev.map((item, index) =>
            index === 0
              ? { ...item, selectedRoom: roomsData[0].id, roomDetails: roomsData[0], totalPrice: 0 }
              : item,
          ),
        );
      }
    }
  });

  // Fetch availability data for calendar - wrapper to maintain interface
  const fetchCalendarAvailability = async (startDate: string, endDate: string) => {
    try {
      const calendarData = await fetchCalendarAvailabilityHook({
        startDate,
        endDate,
        showError: true,
        cacheEnabled: false // Disable cache for admin panel
      });
      
      if (calendarData) {
        setAvailabilityData(prev => ({
          ...prev,
          ...calendarData,
          minStayDays: calendarData.generalSettings?.[0]?.minStayDays || 2,
          taxPercentage: calendarData.generalSettings?.[0]?.taxPercentage || 0.1,
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
    }
  };

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

  // Legacy fetchRooms function for compatibility
  const fetchRooms = () => fetchRoomsAndPricing();

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
      const activeBanks = (bankDetails || []).filter((bank: BankDetails) => bank.isActive);
      if (activeBanks.length > 0) {
        setSelectedBankId(activeBanks[0].id);
      }
    })();
  }, [])

  // Force re-render when rate policies with pricing changes
  const [refreshKey, setRefreshKey] = useState(0);
  
  useEffect(() => {
    // Force a re-render by updating a key
    setRefreshKey(prev => prev + 1);
  }, [ratePoliciesWithPricing]);

  // Calculate total amount
  useEffect(() => {
    let total = 0

    bookingItems.forEach((item) => {
      if (item.checkIn && item.checkOut && item.roomDetails) {
        const checkInDate = new Date(item.checkIn)
        const checkOutDate = new Date(item.checkOut)
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

        // Room cost using rate-based pricing - use the adjusted price if available
        let roomCost = 0
        if (item.selectedRateOption?.priceBreakdown?.totalPrice) {
          // Use the already calculated adjusted price from the selected rate option
          roomCost = item.selectedRateOption.priceBreakdown.totalPrice * item.rooms
        } else if (item.selectedRateOption?.ratePolicy) {
          // Fallback: calculate fresh (this shouldn't happen with new flow, but keep for safety)
          const priceData = calculatePriceBreakdown(item.checkIn, item.checkOut, item.roomDetails, item.selectedRateOption.ratePolicy)
          roomCost = priceData.totalPrice * item.rooms
        } else if (item.selectedRateOption?.price) {
          // Use selected rate option price
          roomCost = item.selectedRateOption.price * nights * item.rooms
        } else {
          // Fallback to room price (deprecated path)
          roomCost = item.roomDetails.price * nights * item.rooms
        }
        total += roomCost

        // Extra bed costs
        if (item.hasExtraBed && item.extraBedCount && item.extraBedPrice) {
          const extraBedCost = item.extraBedCount * item.extraBedPrice * nights * item.rooms;
          total += extraBedCost;
        }

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
        totalPrice: 0, // Will be calculated when rate option is selected
      },
    ])
  }

  // Remove booking item
  const removeBookingItem = (index: number) => {
    if (bookingItems.length > 1) {
      setBookingItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // Helper function to calculate maximum guest capacity across all available rooms
  const getMaxGuestCapacity = () => {
    return rooms.reduce((max: number, room: Room) => {
      const roomMaxCapacity = room.allowsExtraBed && room.maxCapacityWithExtraBed 
        ? room.maxCapacityWithExtraBed 
        : room.capacity;
      return Math.max(max, roomMaxCapacity);
    }, 0);
  };

  // Helper function to get maximum guest capacity for a specific room
  const getRoomMaxCapacity = (roomDetails?: Room) => {
    if (!roomDetails) return 0;
    return roomDetails.allowsExtraBed && roomDetails.maxCapacityWithExtraBed 
      ? roomDetails.maxCapacityWithExtraBed 
      : roomDetails.capacity;
  };

  // Helper function to validate guest capacity and find alternatives for a booking item
  const validateGuestCapacityForItem = (item: BookingItem, newAdults: number) => {
    if (!item.roomDetails) return { ...item, adults: newAdults };

    // Reset all states first for consistency
    const resetItem: {
      alternativeRooms: Room[],
      showRoomAlternatives: boolean,
      adults: number,
      hasExtraBed: boolean,
      extraBedCount: number,
      extraBedPrice: number
    } = {
      ...item,
      adults: newAdults,
      showRoomAlternatives: false,
      alternativeRooms: [],
      hasExtraBed: false,
      extraBedCount: 0,
      extraBedPrice: 0
    };

    // Always find ALL rooms that can accommodate the guests
    const availableRooms = rooms.filter((room: Room) => {
      // Check standard capacity
      if (room.capacity >= newAdults) return true;
      
      // Check capacity with extra beds
      if (room.allowsExtraBed && room.maxCapacityWithExtraBed && 
          room.maxCapacityWithExtraBed >= newAdults) return true;
      
      return false;
    });

    if (newAdults > item.roomDetails.capacity) {
      // Check if current room supports extra beds
      if (item.roomDetails.allowsExtraBed && item.roomDetails.maxCapacityWithExtraBed && 
          newAdults <= item.roomDetails.maxCapacityWithExtraBed) {
        // Current room can accommodate with extra beds
        const extraBedsNeeded = newAdults - item.roomDetails.capacity;
        resetItem.hasExtraBed = true;
        resetItem.extraBedCount = extraBedsNeeded;
        resetItem.extraBedPrice = item.roomDetails.extraBedPrice || 0;
      }

      // ALWAYS show alternatives when guest count exceeds current room capacity
      // regardless of whether current room has extra bed capability
      const alternatives = availableRooms.filter((room: Room) => room.id !== item.roomDetails?.id);
      
      if (alternatives.length > 0) {
        resetItem.alternativeRooms = alternatives;
        resetItem.showRoomAlternatives = true;
      }
    }

    return resetItem;
  };

  // Update booking item
  const updateBookingItem = (index: number, field: keyof BookingItem, value: any) => {
    setBookingItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          let updatedItem: any = { ...item, [field]: value }

          // If room is changed, update room details and reset enhancements
          if (field === "selectedRoom") {
            const roomDetails = rooms.find((r) => r.id === value)
            updatedItem.roomDetails = roomDetails
            updatedItem.selectedEnhancements = []
            updatedItem.selectedRateOption = {} // Reset rate option when room changes
            
            // Reset extra bed configuration when room changes
            updatedItem.showRoomAlternatives = false;
            updatedItem.alternativeRooms = [];
            updatedItem.hasExtraBed = false;
            updatedItem.extraBedCount = 0;
            updatedItem.extraBedPrice = 0;

            // Adjust adults count if it exceeds new room's max capacity
            const newRoomMaxCapacity = getRoomMaxCapacity(roomDetails);
            if (updatedItem.adults > newRoomMaxCapacity) {
              updatedItem.adults = newRoomMaxCapacity;
            }

            // Validate guest capacity for new room
            updatedItem = validateGuestCapacityForItem(updatedItem, updatedItem.adults);
          }

          // If adults count changes, validate capacity and handle extra bed logic
          if (field === "adults") {
            const roomMaxCapacity = getRoomMaxCapacity(updatedItem.roomDetails);
            // Only apply max limit, don't force to max value
            const validatedValue = Math.min(value, roomMaxCapacity || getMaxGuestCapacity());
            updatedItem = validateGuestCapacityForItem(updatedItem, validatedValue);
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  // Handle switching to alternative room
  const handleSwitchToAlternativeRoom = (bookingIndex: number, roomId: string) => {
    setBookingItems((prev: any) =>
      prev.map((item: any, i: number) => {
        if (i === bookingIndex) {
          // Reset all related states when switching rooms
          const newRoomDetails = rooms.find((r) => r.id === roomId);
          const updatedItem = {
            ...item,
            selectedRoom: roomId,
            roomDetails: newRoomDetails,
            showRoomAlternatives: false,
            alternativeRooms: [],
            hasExtraBed: false,
            extraBedCount: 0,
            extraBedPrice: 0,
            selectedEnhancements: [], // Reset enhancements when changing rooms
            selectedRateOption: {} // Reset rate option when changing rooms
          };
          
          // Adjust adults count if it exceeds new room's max capacity
          const newRoomMaxCapacity = getRoomMaxCapacity(newRoomDetails);
          const adjustedAdults = Math.min(item.adults, newRoomMaxCapacity);
          updatedItem.adults = adjustedAdults;
          
          // Validate guest capacity for new room
          return validateGuestCapacityForItem(updatedItem, adjustedAdults);
        }
        return item;
      })
    );
  };

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

  // Get rate options for a room - includes ALL active rate policies for admin flexibility
  const getRateOptions = (room: Room, checkIn?: string, checkOut?: string) => {
    const options = [];
    
    // Use rate policies with pricing data if dates are provided and available
    const policiesToUse = (checkIn && checkOut && ratePoliciesWithPricing.length > 0) 
      ? ratePoliciesWithPricing 
      : ratePolicies;
    

    // Show ALL active rate policies, not just room-assigned ones
    policiesToUse.forEach((ratePolicy: any) => {
      if (ratePolicy.isActive) {
        // Find if there's a room rate configuration for this policy
        const roomRate = room?.roomRates?.find((rr: any) => rr.ratePolicy.id === ratePolicy.id);
        const percentageAdjustment = roomRate?.percentageAdjustment || 0;

        // Calculate display price (will be average if dates are provided)
        let displayPrice = 0;
        let priceLabel = "per night";
        let priceBreakdown = null;

        if (checkIn && checkOut) {
          // Calculate pricing using the rate policy data (with or without rateDatePrices)
          priceBreakdown = calculatePriceBreakdown(checkIn, checkOut, room, ratePolicy);
          displayPrice = priceBreakdown.averagePrice;
          priceLabel = priceBreakdown.breakdown.some(day => day.isOverride) ? "avg per night" : "per night";
          
        } else {
          // Calculate base display price using rate policy
          const basePrice = ratePolicy.basePrice || 0;
          if (basePrice > 0) {
            const adjustment = (basePrice * percentageAdjustment) / 100;
            displayPrice = Math.round((basePrice + adjustment) * 100) / 100;
          } else {
            // Fall back to room price if no base price
            displayPrice = room?.price || 0;
          }
        }

        // Apply the rate policy adjustmentPercentage if present (like user app does)
        let finalDisplayPrice = displayPrice;
        let finalPriceBreakdown: any = priceBreakdown;
        
        if (priceBreakdown && ratePolicy.adjustmentPercentage && ratePolicy.adjustmentPercentage !== 0) {
          const adjustmentFactor = 1 + (ratePolicy.adjustmentPercentage / 100);
          const adjustedTotalPrice = Math.round(priceBreakdown.totalPrice * adjustmentFactor * 100) / 100;
          // Calculate average from the adjusted total, not from adjusting the average directly
          const nights = priceBreakdown.breakdown?.length || 1;
          const adjustedAveragePrice = Math.round((adjustedTotalPrice / nights) * 100) / 100;
          
          finalPriceBreakdown = {
            ...priceBreakdown,
            totalPrice: adjustedTotalPrice,
            averagePrice: adjustedAveragePrice,
            subtotalBeforeAdjustment: priceBreakdown.totalPrice,
            adjustmentAmount: adjustedTotalPrice - priceBreakdown.totalPrice,
            adjustmentPercentage: ratePolicy.adjustmentPercentage
          };
          
          finalDisplayPrice = adjustedAveragePrice;
        }

        options.push({
          id: ratePolicy.id,
          name: ratePolicy.name,
          description: ratePolicy.description,
          price: finalDisplayPrice,
          priceLabel: priceLabel,
          ratePolicy: ratePolicy, // Include full rate policy for price calculations
          priceBreakdown: finalPriceBreakdown, // Include breakdown if calculated
          discountPercentage: ratePolicy.discountPercentage || 0,
          adjustmentPercentage: ratePolicy.adjustmentPercentage || 0, // Rate policy adjustment
          roomPercentageAdjustment: percentageAdjustment, // Room-specific adjustment  
          isActive: ratePolicy.isActive,
          refundable: ratePolicy.refundable,
          fullPaymentDays: ratePolicy.fullPaymentDays,
          prepayPercentage: ratePolicy.prepayPercentage,
          changeAllowedDays: ratePolicy.changeAllowedDays,
          rebookValidityDays: ratePolicy.rebookValidityDays,
          paymentStructure: ratePolicy.paymentStructure,
          cancellationPolicy: ratePolicy.cancellationPolicy,
          type: roomRate ? "configured" : "available", // Distinguish between configured and available policies
        });
      }
    });

    // If no rate policies are available, show base room price as fallback
    if (options.length === 0) {
      options.push({
        id: "base",
        name: `${room?.name} Base Rate`,
        description: "Standard room rate",
        price: room?.price || 0,
        priceLabel: "per night",
        discountPercentage: 0,
        adjustmentPercentage: 0,
        isActive: true,
        refundable: true,
        type: "base",
      });
    }

    return options;
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

          // Calculate room cost using the adjusted pricing from rateOption
          let roomCost = 0
          if (rateOption.priceBreakdown && rateOption.priceBreakdown.totalPrice) {
            // Use the already calculated adjusted price from getRateOptions (includes rate adjustments)
            roomCost = rateOption.priceBreakdown.totalPrice * item.rooms
          } else if (rateOption.ratePolicy && item.roomDetails) {
            // Fallback: calculate fresh (this shouldn't happen with the new flow, but keep for safety)
            const priceData = calculatePriceBreakdown(item.checkIn, item.checkOut, item.roomDetails, rateOption.ratePolicy)
            roomCost = priceData.totalPrice * item.rooms
          } else {
            // Final fallback to simple rate option price
            roomCost = rateOption.price * nights * item.rooms
          }

          // Calculate extra bed costs
          let extraBedCost = 0;
          if (item.hasExtraBed && item.extraBedCount && item.extraBedPrice) {
            extraBedCost = item.extraBedCount * item.extraBedPrice * nights * item.rooms;
          }

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
          const totalPrice = roomCost + extraBedCost + enhancementCost

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
      sendConfirmationEmail: paymentMethod === 'STRIPE' ? sendConfirmationEmail : undefined,
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
            key={refreshKey}
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
            refreshRatePricingForDates={refreshRatePolicingForDates}
            handleSwitchToAlternativeRoom={handleSwitchToAlternativeRoom}
            getRoomMaxCapacity={getRoomMaxCapacity}
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
                {loader ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : bankDetails?.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No active bank accounts found. Please add bank accounts in Settings.
                  </div>
                ) : (
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {bankDetails?.map((bank: BankDetails) => (
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
              <div className="mt-2 flex items-center">
                <input
                  id="send-confirmation-email"
                  type="checkbox"
                  className="mr-2"
                  checked={sendConfirmationEmail}
                  onChange={e => setSendConfirmationEmail(e.target.checked)}
                  disabled={loadingAction}
                />
                <label htmlFor="send-confirmation-email" className="text-sm text-gray-700 select-none">
                  Send confirmation email automatically
                </label>
              </div>
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
