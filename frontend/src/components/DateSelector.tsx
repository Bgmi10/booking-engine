/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const DateSelector = ({ onSelect }: { onSelect: (dates: { startDate: Date | null; endDate: Date | null }) => void }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDates, setSelectedDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  })
  const [selectionStage, setSelectionStage] = useState("arrival") // Track selection stage
  const [currentMonths, setCurrentMonths] = useState([
    new Date(2025, 4), // May 2025
    new Date(2025, 5), // June 2025
  ])
  const [warningMessage, setWarningMessage] = useState("")
  
  // Get today's date at midnight for comparison
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Handle date selection with validation
  const handleDateClick = (date: Date) => {
    // Check if date is in the past
    if (date < today) {
      setWarningMessage("Cannot select dates in the past")
      setTimeout(() => setWarningMessage(""), 3000) // Clear warning after 3 seconds
      return
    }
    
    setWarningMessage("") // Clear any existing warning
    
    if (!selectedDates.startDate || (selectedDates.startDate && selectedDates.endDate)) {
      // Start a new selection
      setSelectedDates({
        startDate: date,
        endDate: null,
      })
      setSelectionStage("departure") // Switch to departure selection
    } else {
      // Complete the selection
      if (date < selectedDates.startDate) {
        setSelectedDates({
          startDate: date,
          endDate: selectedDates.startDate,
        })
      } else {
        setSelectedDates({
          startDate: selectedDates.startDate,
          endDate: date,
        })
      }
      setSelectionStage("arrival") // Reset to arrival for next selection
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

  // Navigate to previous month
  const goToPreviousMonth = () => {
    // Check if going to previous month would show dates before current month
    const prevMonth = new Date(currentMonths[0].getFullYear(), currentMonths[0].getMonth() - 1)
    const currentMonth = new Date(today.getFullYear(), today.getMonth())
    
    // Only navigate if previous month isn't before current month
    if (prevMonth >= currentMonth) {
      setCurrentMonths((prevMonths) => [
        new Date(prevMonths[0].getFullYear(), prevMonths[0].getMonth() - 1),
        new Date(prevMonths[1].getFullYear(), prevMonths[1].getMonth() - 1),
      ])
    }
  }

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonths((prevMonths) => [
      new Date(prevMonths[0].getFullYear(), prevMonths[0].getMonth() + 1),
      new Date(prevMonths[1].getFullYear(), prevMonths[1].getMonth() + 1),
    ])
  }

  // Generate days for a month
  const generateDaysForMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Adjust for Monday as first day of week (0 = Monday, 6 = Sunday)
    let dayOfWeek = firstDay.getDay() - 1
    if (dayOfWeek === -1) dayOfWeek = 6 // Sunday becomes 6

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < dayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  // Effect to notify parent component when dates change
  useEffect(() => {
    if (selectedDates.startDate && selectedDates.endDate) {
      // Only call onSelect when both dates are selected
      onSelect && onSelect(selectedDates)
    }
  }, [selectedDates.startDate, selectedDates.endDate, onSelect]) // Added onSelect to dependency array

  // Initialize calendar to current month on first load
  useEffect(() => {
    // Set the current month and next month
    const currentDate = new Date()
    setCurrentMonths([
      new Date(currentDate.getFullYear(), currentDate.getMonth()),
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    ])
  }, [])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  // Function to reset selections
  const resetSelections = () => {
    setSelectedDates({
      startDate: null,
      endDate: null
    })
    setSelectionStage("arrival")
    setWarningMessage("")
  }

  return (
    <div className="relative">
      <button
        className="cursor-pointer w-full px-4 py-3 border border-gray-300 rounded-md flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
        onClick={() => setIsOpen(true)}
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
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop overlay */}
            <motion.div 
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Calendar modal */}
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
                      Arrival: {formatDate(selectedDates.startDate)}
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
                    onClick={() => setIsOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Warning message bar */}
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

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {currentMonths.map((month, monthIndex) => (
                    <div key={monthIndex} className={monthIndex === 0 ? "md:border-r md:pr-6" : ""}>
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
                          className={`text-gray-500 hover:text-gray-700 focus:outline-none ${monthIndex === 1 ? "visible" : "invisible"}`}
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
                                  whileTap={isDateInPast(date) ? {} : { scale: 0.95 }}
                                  className={`w-10 h-10 rounded-full focus:outline-none 
                                    ${
                                      isDateInPast(date)
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        : isDateSelected(date)
                                        ? isStartOrEndDate(date)
                                          ? "bg-gray-800 text-white"
                                          : "bg-gray-200 text-gray-800"
                                        : "hover:bg-gray-100 text-gray-700"
                                    }
                                  `}
                                  onClick={() => !isDateInPast(date) && handleDateClick(date)}
                                  disabled={isDateInPast(date)}
                                >
                                  {date.getDate()}
                                </motion.button>
                                
                                {/* Tooltip for past dates */}
                                {isDateInPast(date) && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    Cannot book dates in the past
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
                  </div>
                  <button
                    className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none"
                    onClick={() => setIsOpen(false)}
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