/* eslint-disable @typescript-eslint/no-explicit-any */

interface StepIndicatorProps {
  steps: any[]
  currentStep: number
  setCurrentStep: (step: number) => void
  bookingData: any // Pass booking data to validate completion
}

const StepIndicator = ({ steps, currentStep, setCurrentStep, bookingData }: StepIndicatorProps) => {
  
  // Function to check if a step is completed
  const isStepCompleted = (stepId: number): boolean => {
    switch (stepId) {
      case 1: // Dates step
        return !!(bookingData.checkIn && bookingData.checkOut && bookingData.adults > 0)
      case 2: // Categories step
        return !!(bookingData.selectedRoom)
      case 3: // Rates step
        return !!(bookingData.selectedRateOption)
      case 4: // Summary step
        return !!(bookingData.totalPrice > 0)
      case 5: // Details step
        return false // Only completed when explicitly done, not just reached
      default:
        return false
    }
  }

  // Function to check if a step is accessible
  const isStepAccessible = (stepId: number): boolean => {
    // Current step is always accessible
    if (stepId === currentStep) return true
    
    // Can only go back to completed steps
    if (stepId < currentStep) return true
    
    // Can only go forward if all previous steps are completed
    for (let i = 1; i < stepId; i++) {
      if (!isStepCompleted(i)) {
        return false
      }
    }
    
    return true
  }

  // Handle step click
  const handleStepClick = (stepId: number) => {
    if (isStepAccessible(stepId)) {
      setCurrentStep(stepId)
    }
  }

  // Get step appearance class
  const getStepClass = (step: any) => {
    const isAccessible = isStepAccessible(step.id)
    const isCompleted = isStepCompleted(step.id)
    
    if (currentStep === step.id) {
      return "bg-gray-800 text-white"
    } else if (isCompleted) {
      return "bg-gray-500 text-white"
    } else if (isAccessible) {
      return "bg-gray-500 text-white"
    } else {
      return "bg-gray-200 text-gray-400"
    }
  }

  // Get text class
  const getTextClass = (step: any) => {
    const isAccessible = isStepAccessible(step.id)
    
    if (currentStep === step.id) {
      return "font-medium text-gray-800"
    } else if (!isAccessible) {
      return "text-gray-400"
    } else {
      return "text-gray-500"
    }
  }

  // Get cursor class
  const getCursorClass = (step: any) => {
    return isStepAccessible(step.id) ? "cursor-pointer" : "cursor-not-allowed"
  }

  return (
    <div className="flex items-center justify-center p-4">
      {steps.map((step: any) => (
        <div key={step.id} className="flex items-center">
          <div 
            className={`flex items-center transition-all duration-300 ease-in-out ${getCursorClass(step)}`}
            onClick={() => handleStepClick(step.id)}
          >
            <div
              className={`
                flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ease-in-out
                ${getStepClass(step)}
              `}
            >
              {step.id}
            </div>
            
            <div className="ml-2 hidden sm:block">
              <span className={`text-sm transition-all duration-300 ease-in-out ${getTextClass(step)}`}>
                {step.name}
              </span>
            </div>
          </div>
          
          {step.id < steps.length && (
            <div
              className={`
                lg:w-44 sm: w-7 h-[2px] mx-2 transition-all duration-300 ease-in-out
                ${isStepCompleted(step.id) ? "bg-gray-500" : "bg-gray-200"}
              `}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default StepIndicator