/* eslint-disable @typescript-eslint/no-explicit-any */
const StepIndicator = ({ steps, currentStep, setCurrentStep }: { steps: any[], currentStep: number, setCurrentStep: () => void }) => {
    return (
      <div className="flex items-center justify-between p-4">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center" onClick={() => setCurrentStep(step.id)}>
            <div
              className={`
              flex items-center justify-center w-6 h-6 rounded-full 
              ${
                currentStep === step.id
                  ? "bg-gray-800 text-white"
                  : currentStep > step.id
                    ? "bg-gray-500 text-white"
                    : "bg-gray-200 text-gray-700"
              }
            `}
            >
              {step.id}
            </div>
  
            <div className="ml-2 hidden sm:block">
              <span className={`text-sm ${currentStep === step.id ? "font-medium" : "text-gray-500"}`}>{step.name}</span>
            </div>
  
            {step.id < steps.length && (
              <div
                className={`
                lg:w-52 sm: w-7 h-[2px] mx-2 
                ${currentStep > step.id ? "bg-gray-500" : "bg-gray-200"}
              `}
              ></div>
            )}
          </div>
        ))}
      </div>
    )
  }
  
  export default StepIndicator
  