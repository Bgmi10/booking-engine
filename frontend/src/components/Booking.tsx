/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import Header from "./Header"
import DateSelector from "./DateSelector"
import Loader from "./Loader"
import StepIndicator from "./StepIndicator"

// Define the steps in the booking process
const STEPS = [
  { id: 1, name: "Dates" },
  { id: 2, name: "Categories" },
  { id: 3, name: "Rates" },
  { id: 4, name: "Summary" },
  { id: 5, name: "Details" },
]

export default function Booking() {
  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [bookingData, setBookingData] = useState({
    checkIn: null,
    checkOut: null,
    adults: 0,
    promotionCode: "",
  })

  // Handle moving to the next step
  const handleNext = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
      setIsLoading(false)
    }, 800)
  }

  // Handle moving to the previous step
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Update booking data
  const updateBookingData = (data: any) => {
    setBookingData((prev) => ({ ...prev, ...data }))
  }

  // Handle adults count change
  const handleAdultsChange = (increment: number) => {
    setBookingData((prev) => ({
      ...prev,
      adults: Math.max(0, prev.adults + increment),
    }))
  }

  // Handle promotion code change
  const handlePromotionCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBookingData((prev) => ({
      ...prev,
      promotionCode: e.target.value,
    }))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Main content */}
      <main className="flex-1 relative">
        {/* Background image */}
        {currentStep === 1 && <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg.png?height=800&width=1200')" }}
        />}

        {/* Step indicator - Fixed with proper full width */}
        <div className="w-full bg-white relative z-10">
          <div className="container px-4">
            <div className="py-4">
              <StepIndicator steps={STEPS} currentStep={currentStep} />
            </div>
          </div>
        </div>
         
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Step content */}
          <div className="max-w-lg mx-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader />
              </div>
            ) : (
              <>
                {currentStep === 1 && (
                  <div className="bg-white rounded-lg shadow-lg p-4">
                    <h2 className="text-xl font-normal mb-4">Dates</h2>

                    <div className="mb-6">
                      <DateSelector
                        onSelect={(dates) =>
                          updateBookingData({
                            checkIn: dates.startDate,
                            checkOut: dates.endDate,
                          })
                        }
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-gray-700 font-medium mb-2">Adults</label>
                      <div className="flex items-center border rounded-md border-gray-300">
                        <button
                          className="px-4 py-2 text-gray-500 cursor-pointer"
                          onClick={() => handleAdultsChange(-1)}
                        >
                          −
                        </button>
                        <span className="flex-1 text-center">{bookingData.adults}</span>
                        <button
                          className="px-4 py-2 text-gray-500 cursor-pointer"
                          onClick={() => handleAdultsChange(1)}
                        >
                          +
                        </button>
                      </div>
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
                      className="w-full bg-gray-800 text-white py-3 rounded-md hover:bg-gray-700 transition-colors"
                      onClick={handleNext}
                    >
                      Next
                    </button>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-semibold mb-6">Categories</h2>
                    <p className="text-gray-600 mb-6">Select your room category</p>
                    {/* Categories content will go here */}
                    <div className="flex justify-between mt-6">
                      <button
                        className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                        onClick={handleBack}
                      >
                        Back
                      </button>
                      <button
                        className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                        onClick={handleNext}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-semibold mb-6">Rates</h2>
                    <p className="text-gray-600 mb-6">Select your rate</p>
                    {/* Rates content will go here */}
                    <div className="flex justify-between mt-6">
                      <button
                        className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                        onClick={handleBack}
                      >
                        Back
                      </button>
                      <button
                        className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                        onClick={handleNext}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-semibold mb-6">Summary</h2>
                    <p className="text-gray-600 mb-6">Review your booking</p>
                    {/* Summary content will go here */}
                    <div className="flex justify-between mt-6">
                      <button
                        className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                        onClick={handleBack}
                      >
                        Back
                      </button>
                      <button
                        className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                        onClick={handleNext}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-semibold mb-6">Details</h2>
                    <p className="text-gray-600 mb-6">Enter your details</p>
                    {/* Details content will go here */}
                    <div className="flex justify-between mt-6">
                      <button
                        className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                        onClick={handleBack}
                      >
                        Back
                      </button>
                      <button
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        onClick={() => alert("Booking completed!")}
                      >
                        Complete Booking
                      </button>
                    </div>
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