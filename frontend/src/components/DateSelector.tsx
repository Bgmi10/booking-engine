import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BiLoader } from "react-icons/bi"

interface DateRestrictionInfo {
  canCheckIn: boolean
  canCheckOut: boolean
  canStay: boolean
  minimumStay?: number
  maximumStay?: number
  restrictionReasons: string[]
  availableRates: string[]
}

interface AvailabilityData {
  fullyBookedDates: string[]
  partiallyBookedDates: string[]
  availableDates: string[]
  restrictedDates: string[]
  dateRestrictions: Record<string, DateRestrictionInfo>
}

interface DateSelectorProps {
  onSelect: (dates: { startDate: Date | null; endDate: Date | null }) => void
  availabilityData: AvailabilityData
  isLoadingAvailability: boolean
  onFetchAvailability: (startDate: string, endDate: string) => Promise<void>
  calenderOpen: boolean
  setCalenderOpen: (calenderOpen: boolean) => void
  minStayDays?: number
  selectedRoomId?: string
  selectedRatePolicyId?: string
  dailyBookingStartTime?: string
}

const DateSelector = ({ 
  onSelect, 
  availabilityData, 
  isLoadingAvailability, 
  onFetchAvailability, 
  calenderOpen, 
  setCalenderOpen,
  minStayDays = 2,
  dailyBookingStartTime = '00:00',
}: DateSelectorProps) => {
  
  const [selectedDates, setSelectedDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  })
  const [selectionStage, setSelectionStage] = useState("arrival")
  const [currentMonths, setCurrentMonths] = useState([
    new Date(2025, 4), // May 2025
    new Date(2025, 5), // June 2025
  ])
  const [warningMessage, setWarningMessage] = useState("")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if booking is allowed for today based on Italian time
  const isCurrentDateBookingAllowed = (date: Date): boolean => {
    const dateStr = formatDateForAPI(date)
    const todayStr = formatDateForAPI(new Date())
    
    // If it's not today, allow booking
    if (dateStr !== todayStr) {
      return true
    }
    
    // Get current time in Italian timezone
    const now = new Date()
    const italianTime = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now)
    
    const [currentHour, currentMinute] = italianTime.split(':').map(Number)
    const [cutoffHour, cutoffMinute] = dailyBookingStartTime.split(':').map(Number)
    
    const currentMinutes = currentHour * 60 + currentMinute
    const cutoffMinutes = cutoffHour * 60 + cutoffMinute
    
    // Reverse logic: allow booking BEFORE the cutoff time, not after
    return currentMinutes < cutoffMinutes
  }

  // Helper function to format date as YYYY-MM-DD
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Add a helper for local date formatting
  function formatDateLocal(date: Date): string {
    // Returns YYYY-MM-DD in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get restriction info for a specific date
  const getDateRestrictionInfo = (date: Date): DateRestrictionInfo | null => {
    const dateStr = formatDateForAPI(date)
    return availabilityData.dateRestrictions?.[dateStr] || null
  }

  // Check if a date is restricted from stay
  const isDateRestrictedFromStay = (date: Date): boolean => {
    const restriction = getDateRestrictionInfo(date)
    return restriction ? !restriction.canStay : false
  }

  // Check if a date is restricted from check-in
  const isDateRestrictedFromCheckIn = (date: Date): boolean => {
    const restriction = getDateRestrictionInfo(date)
    return restriction ? !restriction.canCheckIn : false
  }

  // Check if a date is restricted from check-out
  const isDateRestrictedFromCheckOut = (date: Date): boolean => {
    const restriction = getDateRestrictionInfo(date)
    return restriction ? !restriction.canCheckOut : false
  }

  // Get minimum stay requirement for a date
  const getMinimumStayForDate = (date: Date): number => {
    const restriction = getDateRestrictionInfo(date)
    const restrictionMinStay = restriction?.minimumStay || 0
    return Math.max(minStayDays, restrictionMinStay)
  }

  // Get maximum stay requirement for a date
  const getMaximumStayForDate = (date: Date): number | undefined => {
    const restriction = getDateRestrictionInfo(date)
    return restriction?.maximumStay
  }

  // Helper function to check if a date is fully booked
  const isDateFullyBooked = (date: Date): boolean => {
    const dateStr = formatDateForAPI(date)
    return availabilityData.fullyBookedDates.includes(dateStr)
  }

  // Helper function to check if a date is partially booked
  const isDatePartiallyBooked = (date: Date): boolean => {
    const dateStr = formatDateForAPI(date)
    return availabilityData.partiallyBookedDates.includes(dateStr)
  }

  // Helper function to check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    const dateStr = formatDateForAPI(date)
    return availabilityData.availableDates.includes(dateStr)
  }

  // Helper function to calculate days between dates
  const daysBetween = (startDate: Date, endDate: Date): number => {
    const timeDiff = endDate.getTime() - startDate.getTime()
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }

  // Enhanced validation for departure date selection
  const validateDepartureDateSelection = (arrivalDate: Date, departureDate: Date): { isValid: boolean; reason?: string } => {
    // Same date as arrival
    if (departureDate.getTime() === arrivalDate.getTime()) {
      return { isValid: false, reason: "Departure date cannot be the same as arrival date" }
    }
    
    // Before arrival date
    if (departureDate < arrivalDate) {
      return { isValid: false, reason: "Departure date cannot be before arrival date" }
    }

    // Check if departure date allows check-out
    if (isDateRestrictedFromCheckOut(departureDate)) {
      const restriction = getDateRestrictionInfo(departureDate)
      const reasons = restriction?.restrictionReasons || ["Check-out not allowed on this date"]
      return { isValid: false, reason: reasons[0] }
    }

    // Check minimum stay requirement
    const stayLength = daysBetween(arrivalDate, departureDate)
    const minStayRequired = getMinimumStayForDate(arrivalDate)
    
    if (stayLength < minStayRequired) {
      return { isValid: false, reason: `Minimum stay is ${minStayRequired} days` }
    }

    // Check maximum stay requirement
    const maxStayAllowed = getMaximumStayForDate(arrivalDate)
    if (maxStayAllowed && stayLength > maxStayAllowed) {
      return { isValid: false, reason: `Maximum stay is ${maxStayAllowed} days` }
    }

    // Check if any date in the stay period is restricted
    const stayDates = []
    for (let d = new Date(arrivalDate); d < departureDate; d.setDate(d.getDate() + 1)) {
      stayDates.push(new Date(d))
    }

    for (const stayDate of stayDates) {
      if (isDateRestrictedFromStay(stayDate)) {
        const restriction = getDateRestrictionInfo(stayDate)
        const reasons = restriction?.restrictionReasons || ["Stay not allowed on this date"]
        return { isValid: false, reason: `${formatDateForAPI(stayDate)}: ${reasons[0]}` }
      }
      
      if (isDateFullyBooked(stayDate)) {
        return { isValid: false, reason: `${formatDateForAPI(stayDate)} is fully booked` }
      }
    }

    return { isValid: true }
  }

  // Check if a date is disabled for departure selection
  const isDateDisabledForDeparture = (date: Date): boolean => {
    if (!selectedDates.startDate) return false
    
    const validation = validateDepartureDateSelection(selectedDates.startDate, date)
    return !validation.isValid
  }

  // Enhanced date click handler with comprehensive validation
  const handleDateClick = (date: Date) => {
    // Check if date is in the past
    if (date < today) {
      setWarningMessage("Cannot select dates in the past")
      setTimeout(() => setWarningMessage(""), 3000)
      return
    }

    // Priority 1: Check booking status first (overrides time restrictions)
    if (isDateFullyBooked(date)) {
      setWarningMessage("This date is fully booked")
      setTimeout(() => setWarningMessage(""), 3000)
      return
    }

    // If selecting arrival date
    if (!selectedDates.startDate || (selectedDates.startDate && selectedDates.endDate)) {
      // Priority 2: Check calendar restrictions
      if (isDateRestrictedFromCheckIn(date)) {
        const restriction = getDateRestrictionInfo(date)
        const reasons = restriction?.restrictionReasons || ["Check-in not allowed on this date"]
        setWarningMessage(reasons[0])
        setTimeout(() => setWarningMessage(""), 3000)
        return
      }

      if (isDateRestrictedFromStay(date)) {
        const restriction = getDateRestrictionInfo(date)
        const reasons = restriction?.restrictionReasons || ["Stay not allowed on this date"]
        setWarningMessage(reasons[0])
        setTimeout(() => setWarningMessage(""), 3000)
        return
      }

      // Priority 3: Check time restrictions for available dates only
      if (!isCurrentDateBookingAllowed(date)) {
        const [cutoffHour, cutoffMinute] = dailyBookingStartTime.split(':').map(Number)
        const timeStr = `${cutoffHour.toString().padStart(2, '0')}:${cutoffMinute.toString().padStart(2, '0')}`
        setWarningMessage(`Booking for today is closed after ${timeStr} (Italian time)`)
        setTimeout(() => setWarningMessage(""), 5000)
        return
      }

      // Set as arrival date
      setSelectedDates({
        startDate: date,
        endDate: null,
      })
      setSelectionStage("departure")
      setWarningMessage("")
      return
    }

    // If selecting departure date
    if (selectedDates.startDate && !selectedDates.endDate) {
      const validation = validateDepartureDateSelection(selectedDates.startDate, date)
      
      if (!validation.isValid) {
        setWarningMessage(validation.reason || "Invalid departure date")
        setTimeout(() => setWarningMessage(""), 3000)
        return
      }

      // Set as departure date
      setSelectedDates({
        startDate: selectedDates.startDate,
        endDate: date,
      })
      setSelectionStage("arrival")
      setWarningMessage("")
    }
  }

  // Format date for display
  const formatDate = (date: Date) => {
    if (!date) return ""
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  }

  // Check if a date is selected
  const isDateSelected = (date: Date) => {
    if (!selectedDates.startDate) return false

    if (!selectedDates.endDate) {
      return date.getTime() === selectedDates.startDate.getTime()
    }

    return date >= selectedDates.startDate && date <= selectedDates.endDate
  }

  // Check if a date is the start or end date
  const isStartOrEndDate = (date: Date) => {
    if (!selectedDates.startDate) return false
    
    if (!selectedDates.endDate) {
      return date.getTime() === selectedDates.startDate.getTime()
    }

    return date.getTime() === selectedDates.startDate.getTime() || date.getTime() === selectedDates.endDate.getTime()
  }

  // Check if a date is in the past
  const isDateInPast = (date: Date) => {
    return date < today
  }

  // Enhanced availability state function
  const getDateAvailabilityState = (date: Date): 'fullyBooked' | 'partiallyBooked' | 'available' | 'restricted' | 'unknown' => {
    const dateStr = formatDateForAPI(date)
    
    // Check restrictions first
    if (availabilityData.restrictedDates.includes(dateStr) || isDateRestrictedFromStay(date)) {
      return 'restricted'
    }
    
    // Check booking status
    if (availabilityData.fullyBookedDates.includes(dateStr)) {
      return 'fullyBooked'
    }
    
    if (availabilityData.partiallyBookedDates.includes(dateStr)) {
      return 'partiallyBooked'
    }
    
    if (availabilityData.availableDates.includes(dateStr)) {
      return 'available'
    }
    
    return 'unknown'
  }
  
  // Enhanced date styling with restriction handling
  const getDateStyling = (date: Date) => {
    if (isDateInPast(date)) {
      return "bg-gray-100 text-gray-400 cursor-not-allowed"
    }

    // Always highlight the arrival date when it's selected
    if (selectedDates.startDate && date.getTime() === selectedDates.startDate.getTime()) {
      return "bg-gray-800 text-white"
    }

    // Check if date is disabled for departure selection
    if (selectedDates.startDate && !selectedDates.endDate && isDateDisabledForDeparture(date)) {
      return "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
    }
  
    const availabilityState = getDateAvailabilityState(date)

    if (isDateSelected(date)) {
      if (isStartOrEndDate(date)) {
        return "bg-gray-800 text-white"
      }
      return "bg-gray-200 text-gray-800"
    }
  
    // Priority 1: Show booking status first (overrides time restrictions)
    switch (availabilityState) {
      case 'restricted':
        return "bg-orange-100 text-orange-600 cursor-not-allowed"
      case 'fullyBooked':
        return "bg-red-100 text-red-600 cursor-not-allowed"
      case 'partiallyBooked':
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case 'available':
        // Priority 2: For available dates, check time restrictions
        if (!isCurrentDateBookingAllowed(date)) {
          return "bg-orange-100 text-orange-600 cursor-not-allowed"
        }
        return "bg-green-50 text-green-800 hover:bg-green-100"
      default:
        // Priority 3: For unknown status dates, check time restrictions
        if (!isCurrentDateBookingAllowed(date)) {
          return "bg-orange-100 text-orange-600 cursor-not-allowed"
        }
        return "hover:bg-gray-100 text-gray-700"
    }
  }

  // Enhanced tooltip with restriction information
  const getDateTooltip = (date: Date) => {
    if (isDateInPast(date)) {
      return "Cannot book dates in the past"
    }

    const restriction = getDateRestrictionInfo(date)
    
    // Check if date is disabled for departure selection
    if (selectedDates.startDate && !selectedDates.endDate && isDateDisabledForDeparture(date)) {
      const validation = validateDepartureDateSelection(selectedDates.startDate, date)
      return validation.reason || "Cannot select this departure date"
    }

    // Priority 1: Show booking status first (overrides time restrictions)
    if (isDateFullyBooked(date)) {
      return "Fully booked - no rooms available"
    }

    if (isDatePartiallyBooked(date)) {
      return "Limited availability"
    }

    // Priority 2: Show restriction reasons
    if (restriction && restriction.restrictionReasons.length > 0) {
      return restriction.restrictionReasons[0]
    }

    // Priority 3: Show time restriction only for available dates
    if (isDateAvailable(date) || getDateAvailabilityState(date) === 'unknown') {
      // Check if current date booking is not allowed due to time restriction
      if (!isCurrentDateBookingAllowed(date)) {
        const [cutoffHour, cutoffMinute] = dailyBookingStartTime.split(':').map(Number)
        const timeStr = `${cutoffHour.toString().padStart(2, '0')}:${cutoffMinute.toString().padStart(2, '0')}`
        return `Booking for today is closed after ${timeStr} (Italian time)`
      }

      let tooltip = "Available"
      if (restriction) {
        if (restriction.minimumStay && restriction.minimumStay > minStayDays) {
          tooltip += ` (Min stay: ${restriction.minimumStay} days)`
        }
        if (restriction.maximumStay) {
          tooltip += ` (Max stay: ${restriction.maximumStay} days)`
        }
      }
      return tooltip
    }

    return ""
  }

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonths[0].getFullYear(), currentMonths[0].getMonth() - 1)
    const currentMonth = new Date(today.getFullYear(), today.getMonth())
    
    if (prevMonth >= currentMonth) {
      const newMonths = [
        new Date(currentMonths[0].getFullYear(), currentMonths[0].getMonth() - 1),
        new Date(currentMonths[1].getFullYear(), currentMonths[1].getMonth() - 1),
      ]
      setCurrentMonths(newMonths)
      fetchAvailabilityForMonths(newMonths)
    }
  }

  // Navigate to next month
  const goToNextMonth = () => {
    const newMonths = [
      new Date(currentMonths[0].getFullYear(), currentMonths[0].getMonth() + 1),
      new Date(currentMonths[1].getFullYear(), currentMonths[1].getMonth() + 1),
    ]
    setCurrentMonths(newMonths)
    fetchAvailabilityForMonths(newMonths)
  }

  // Fetch availability for given months
  const fetchAvailabilityForMonths = (months: Date[]) => {
    const startOfRange = new Date(months[0].getFullYear(), months[0].getMonth(), 1)
    const endOfRange = new Date(months[1].getFullYear(), months[1].getMonth() + 1, 0)
    
    const startDate = formatDateForAPI(startOfRange)
    const endDate = formatDateForAPI(endOfRange)
    
    onFetchAvailability(startDate, endDate)
  }

  // Generate days for a month
  const generateDaysForMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    let dayOfWeek = firstDay.getDay() - 1
    if (dayOfWeek === -1) dayOfWeek = 6

    const days = []

    for (let i = 0; i < dayOfWeek; i++) {
      days.push(null)
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  // Enhanced clickability check
  const isDateClickable = (date: Date): boolean => {
    if (isDateInPast(date)) return false
    
    // Priority 1: Check booking status first (fully booked overrides time restrictions)
    if (isDateFullyBooked(date)) return false
    
    // Priority 2: Check calendar restrictions
    // For arrival date selection
    if (!selectedDates.startDate || (selectedDates.startDate && selectedDates.endDate)) {
      if (isDateRestrictedFromCheckIn(date) || isDateRestrictedFromStay(date)) return false
    }
    
    // For departure date selection
    if (selectedDates.startDate && !selectedDates.endDate) {
      if (isDateDisabledForDeparture(date)) return false
    }
    
    // Priority 3: Check time restrictions (only if not booked and not restricted)
    if (!isCurrentDateBookingAllowed(date)) return false
    
    return true
  }

  // Initialize calendar to current month on first load
  useEffect(() => {
    const currentDate = new Date()
    const months = [
      new Date(currentDate.getFullYear(), currentDate.getMonth()),
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    ]
    setCurrentMonths(months)
  }, [])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (calenderOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [calenderOpen])

  // Function to reset selections
  const resetSelections = () => {
    setSelectedDates({
      startDate: null,
      endDate: null
    })
    setSelectionStage("arrival")
    setWarningMessage("")
  }

  // Get current minimum stay requirement
  const getCurrentMinStay = () => {
    if (selectedDates.startDate) {
      return getMinimumStayForDate(selectedDates.startDate)
    }
    return minStayDays
  }

  return (
    <div className="relative">
      <button
        className="cursor-pointer w-full px-4 py-3 border border-gray-300 rounded-md flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
        onClick={() => setCalenderOpen(true)}
      >
        <span className="text-gray-700">
          {selectedDates.startDate && selectedDates.endDate
            ? `${formatDate(selectedDates.startDate)} - ${formatDate(selectedDates.endDate)}`
            : "Select dates"}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <AnimatePresence>
        {calenderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCalenderOpen(false)}
            />
            
            <motion.div
              className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 md:mx-auto max-h-[90vh] overflow-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-center p-5 border-b border-gray-200">
                <div className="flex items-center">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectionStage === "arrival" ? "Arrival" : "Departure"}
                  </h3>
                  {selectedDates.startDate && !selectedDates.endDate && (
                    <span className="ml-4 text-sm text-gray-500">
                      Arrival: {formatDate(selectedDates.startDate)} | Min stay: {getCurrentMinStay()} days
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(selectedDates.startDate || selectedDates.endDate) && (
                    <button
                      className="text-gray-500 border border-gray-300 hover:text-gray-700 focus:outline-none hover:cursor-pointer hover:bg-gray-100 rounded-md px-3 py-1 text-sm"
                      onClick={resetSelections}
                    >
                      Reset
                    </button>
                  )}
                  <button 
                    className="text-gray-500 border border-gray-300 hover:text-gray-700 focus:outline-none hover:cursor-pointer hover:bg-gray-100 rounded-md p-1"
                    onClick={() => setCalenderOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <AnimatePresence>
                {warningMessage && (
                  <motion.div 
                    className="bg-red-100 text-red-700 p-3 text-center"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {warningMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoadingAvailability && (
                <div className="bg-black/70 text-white p-3 text-center text-sm lg:text-lg absolute z-50 top-20 inset-0 flex items-center justify-center">
                  <BiLoader className="animate-spin text-white" /> Loading availability...
                </div>
              )}

              <div className="p-5 pb-0">
                <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                    <span>Limited availability</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 rounded"></div>
                    <span>Fully booked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-100 rounded"></div>
                    <span>Restricted</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-100 rounded"></div>
                    <span>Past dates / Unavailable</span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {currentMonths.map((month, monthIndex) => (
                    <div key={monthIndex} className={monthIndex === 0 ? "md:border-r border-gray-400 md:pr-6" : ""}>
                      <div className="flex justify-between items-center mb-4">
                        <button
                          className={`text-gray-500 hover:text-gray-700 focus:outline-none ${
                            monthIndex === 0 ? "visible" : "invisible"
                          }`}
                          onClick={goToPreviousMonth}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <h4 className="text-md font-medium flex-1 text-center">
                          {month.toLocaleString("default", { month: "long", year: "numeric" })}
                        </h4>
                        <button
                          className={`text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none ${monthIndex === 1 ? "visible" : "invisible"}`}
                          onClick={goToNextMonth}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-7 text-center">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <div key={day} className="py-2 text-gray-500 text-sm">
                            {day}
                          </div>
                        ))}

                        {generateDaysForMonth(month.getFullYear(), month.getMonth()).map((date, index) => (
                          <div key={index} className="py-1 relative group">
                            {date ? (
                              <>
                                <motion.button
                                  whileTap={
                                    isDateClickable(date) ? { scale: 0.95 } : {}
                                  }
                                  className={`w-10 h-10 rounded-full focus:outline-none ${getDateStyling(date)}`}
                                  onClick={() => 
                                    isDateClickable(date) && handleDateClick(date)
                                  }
                                  disabled={!isDateClickable(date)}
                                >
                                  {date.getDate()}
                                </motion.button>
                                
                                {getDateTooltip(date) && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    {getDateTooltip(date)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="w-10 h-10 inline-block"></span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection status and confirm button */}
              {selectedDates.startDate && selectedDates.endDate && (
                <div className="border-t border-gray-200 p-5 flex justify-between items-center">
                  <div className="text-sm">
                    <div><span className="font-medium">Arrival:</span> {formatDate(selectedDates.startDate)}</div>
                    <div><span className="font-medium">Departure:</span> {formatDate(selectedDates.endDate)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {daysBetween(selectedDates.startDate, selectedDates.endDate)} days
                    </div>
                  </div>
                  <button
                    className="bg-gray-800 cursor-pointer text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none "
                    onClick={() => {
                      setCalenderOpen(false);
                      onSelect && onSelect({
                        startDate: selectedDates.startDate ? new Date(formatDateLocal(selectedDates.startDate)) : null,
                        endDate: selectedDates.endDate ? new Date(formatDateLocal(selectedDates.endDate)) : null,
                      });
                    }}
                  >
                    Confirm
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DateSelector