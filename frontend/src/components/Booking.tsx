import { useEffect, useState, useCallback } from "react"
import Header from "./Header"
import DateSelector from "./DateSelector"
import StepIndicator from "./StepIndicator"
import { BiLoader } from "react-icons/bi"
import { useCalendarAvailability } from "../hooks/useCalendarAvailability"
import Categories from "./Categories"
import Rates from "./Rates"
import Summary from "./Summary"
import Details from "./Details"

// Define the steps in the booking process
const STEPS = [
  { id: 1, name: "Dates" },
  { id: 2, name: "Categories" },
  { id: 3, name: "Rates" },
  { id: 4, name: "Summary" },
  { id: 5, name: "Details" },
]

// Types for availability data
interface AvailabilityData {
  fullyBookedDates: string[]
  partiallyBookedDates: string[]
  availableDates: string[]
  minStayDays: number
  taxPercentage: number
  restrictedDates: string[],
  dateRestrictions: {}
  dailyBookingStartTime: string
  availableRooms?: any[]
  unavailableRooms?: any[]
}

export default function Booking() {
  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>({
    fullyBookedDates: [],
    partiallyBookedDates: [],
    availableDates: [],
    minStayDays: 0,
    taxPercentage: 0.1,
    restrictedDates: [],
    dateRestrictions: {},
    dailyBookingStartTime: '00:00',
    availableRooms: [],
    unavailableRooms: []
  });

  const [calenderOpen, setCalenderOpen] = useState(false)
  const [bookingItems, setBookingItems] = useState([]);
  const [bookingData, setBookingData] = useState({
    checkIn: null,
    checkOut: null,
    adults: 2,
    promotionCode: "",
    selectedEnhancements: [],
    selectedRoom: null,
    selectedRateOption: null,
    totalPrice: 0,
  })
  
  // Use the centralized calendar availability hook
  const { fetchCalendarAvailability, loading: isLoadingAvailability } = useCalendarAvailability()

  // Handle moving to the next step
  const handleNext = () => {
    setIsLoading(true)
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    setIsLoading(false);  
  }

  // Memoize the date selection callback to prevent infinite loops
  const handleDateSelect = useCallback((dates: { startDate: Date | null; endDate: Date | null }) => {
    setBookingData((prev: any) => ({
      ...prev,
      checkIn: dates.startDate,
      checkOut: dates.endDate,
    }))
  }, [])

  // Handle promotion code change
  const handlePromotionCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBookingData((prev) => ({
      ...prev,
      promotionCode: e.target.value,
    }))
  }

  // Fetch availability using the centralized hook
  const fetchCalendarAvailabilityWrapper = useCallback(async (startDate: string, endDate: string, isCallFromCalender: boolean) => {
    try {
      const calendarData = await fetchCalendarAvailability({
        startDate,
        endDate,
        showError: true,
        cacheEnabled: !isCallFromCalender // Enable cache when not called from calendar
      });
      
      if (calendarData) {
        const processedData = {
          fullyBookedDates: calendarData.fullyBookedDates || [],
          partiallyBookedDates: calendarData.partiallyBookedDates || [],
          availableDates: calendarData.availableDates || [],
          minStayDays: calendarData.generalSettings?.[0]?.minStayDays || 2,
          taxPercentage: calendarData.generalSettings?.[0]?.taxPercentage || 0.1,
          dateRestrictions: calendarData.dateRestrictions || {},
          restrictedDates: calendarData.restrictedDates || [],
          dailyBookingStartTime: calendarData.generalSettings?.[0]?.dailyBookingStartTime || '00:00',
          availableRooms: calendarData.availableRooms || [],
          unavailableRooms: calendarData.unavailableRooms || []
        };
        
        setAvailabilityData(processedData);
      }
    } catch (error) {
      console.error("Error fetching calendar availability:", error);
      // Set empty availability data on error
      const emptyData = {
        fullyBookedDates: [],
        partiallyBookedDates: [],
        availableDates: [],
        minStayDays: 0,
        taxPercentage: 0.1,
        restrictedDates: [],
        dateRestrictions: {},
        dailyBookingStartTime: '00:00',
        availableRooms: [],
        unavailableRooms: []
      };
      setAvailabilityData(emptyData);
    }
  }, [fetchCalendarAvailability])

  useEffect(() => {
    if (bookingData.checkIn && bookingData.checkOut) {
      fetchCalendarAvailabilityWrapper(bookingData.checkIn, bookingData.checkOut, true)
    }
  }, [bookingData.checkIn, bookingData.checkOut, fetchCalendarAvailabilityWrapper])

  useEffect(() => {
    if (calenderOpen) {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0) // Next month end
      
      // Use the same date formatting method as DateSelector to avoid timezone issues
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      const startDate = formatDateForAPI(startOfMonth)
      const endDate = formatDateForAPI(endOfMonth)
      
      // This will now check cache first before making API call
      fetchCalendarAvailabilityWrapper(startDate, endDate, false)
    }
  }, [calenderOpen, fetchCalendarAvailabilityWrapper])
  
 return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 relative bg-gray-100">
        {/* Background image */}
        {currentStep === 1 && <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg.png?height=800&width=1200')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        />}

        {/* Step indicator - Fixed with proper full width */}
        <div className="w-full bg-white relative z-10">
          <div className="container px-4">
            <div className="py-4">
              <StepIndicator steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} bookingData={bookingData} />
            </div>
          </div>
        </div>
         
        <div className="relative z-10 container mx-auto px-4">
          {/* Step content */}
          <div className={`${currentStep !== 1 ? "max-w-6xl" : "max-w-lg"} mx-auto`}>
            {isLoading ? (
              <div className="flex justify-center items-center h-64 text-md gap-1">
                <BiLoader className="animate-spin" /> Loading booking engine 
              </div>
            ) : (
              <>
                {currentStep === 1 && (
                  <div className="bg-white rounded-lg shadow-lg p-4 mt-6">
                    <h2 className="text-xl font-normal mb-4">Dates</h2>

                    <div className="mb-6">
                      <DateSelector
                        minStayDays={availabilityData.minStayDays}
                        calenderOpen={calenderOpen}
                        setCalenderOpen={setCalenderOpen}
                        onSelect={handleDateSelect}
                        availabilityData={availabilityData}
                        isLoadingAvailability={isLoadingAvailability}
                        dailyBookingStartTime={availabilityData.dailyBookingStartTime}
                        //@ts-ignore
                        onFetchAvailability={fetchCalendarAvailabilityWrapper}
                      />
                    </div>

                    <div className="mb-6 ">
                      <label className="block text-gray-700 font-medium mb-2">Promotion code <span className="text-gray-500 text-sm">(optional)</span></label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border rounded-md focus:outline-none border-gray-300"
                        value={bookingData.promotionCode}
                        onChange={handlePromotionCodeChange}
                      />
                    </div>

                    <button
                      className={`w-full bg-gray-800 text-white py-3 rounded-md hover:bg-gray-700 transition-colors  ${!bookingData.checkIn && !bookingData.checkOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} `}
                      onClick={handleNext}
                      disabled={!bookingData.checkIn || !bookingData.checkOut}
                    >
                      Next
                    </button>
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <Categories availabilityData={availabilityData} bookingData={bookingData} setCurrentStep={setCurrentStep} setBookingData={setBookingData} minStayDays={availabilityData.minStayDays} />
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <Rates bookingData={bookingData} setCurrentStep={setCurrentStep} availabilityData={availabilityData} setBookingData={setBookingData} />
                  </div>
                )}

                {currentStep === 4 && (
                  <div>
                    <Summary bookingData={bookingData}  bookingItems={bookingItems} setBookingData={setBookingData} setBookingItems={setBookingItems} setCurrentStep={setCurrentStep} availabilityData={availabilityData} taxPercentage={availabilityData.taxPercentage} />
                  </div>
                )}

                {currentStep === 5 && (
                  <div>
                    <Details bookingData={bookingData} bookingItems={bookingItems} availabilityData={availabilityData} taxPercentage={availabilityData.taxPercentage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}