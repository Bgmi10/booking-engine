import { useState } from "react"

interface TermsStepProps {
    formData: any
    updateFormData: (data: any) => void
    onNext: () => void
    onSubmit: () => void
    isLastStep: boolean
}

export const TermsStep = ({ formData, updateFormData, onSubmit }: TermsStepProps) => {
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.tcAgreed) {
            newErrors.tcAgreed = 'You must agree to the Property T&C to continue'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (validateForm()) {
            setIsSubmitting(true)
            try {
                await onSubmit()
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    const handleCheckboxChange = (field: string, checked: boolean) => {
        updateFormData({ [field]: checked })
        // Clear error when user checks
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' })
        }
    }

    return (
        <div className="space-y-8">
            {/* Terms and Conditions */}
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <input
                        type="checkbox"
                        id="tcAgreed"
                        checked={formData.tcAgreed}
                        onChange={(e) => handleCheckboxChange('tcAgreed', e.target.checked)}
                        className={`mt-1 w-5 h-5 text-gray-800 border-2 rounded-md focus:ring-2 focus:ring-gray-400 transition-all duration-300 ${
                            errors.tcAgreed ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    <label htmlFor="tcAgreed" className="text-gray-800 font-medium">
                        I agree to{' '}
                        <a 
                            href="" 
                            className="text-gray-900 hover:text-gray-700 underline font-medium transition-colors duration-300"
                            onClick={(e) => {
                                e.preventDefault()
                                window.open('https://www.latorre.farm/terms', '_blank')
                            }}
                        >
                            Property Terms & Conditions
                        </a>
                        <span className="text-red-500 ml-1">*</span>
                    </label>
                </div>
                {errors.tcAgreed && <p className="ml-9 text-sm text-red-600">{errors.tcAgreed}</p>}

                <div className="flex items-start gap-4">
                    <input
                        type="checkbox"
                        id="receiveMarketingEmail"
                        checked={formData.receiveMarketingEmail}
                        onChange={(e) => handleCheckboxChange('receiveMarketingEmail', e.target.checked)}
                        className="mt-1 w-5 h-5 text-gray-800 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 transition-all duration-300"
                    />
                    <label htmlFor="receiveMarketingEmail" className="text-gray-700">
                        I'd like to occasionally receive marketing emails from La Torre sulla via Francigena.
                    </label>
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isSubmitting ? (
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Completing Check-In...</span>
                        </div>
                    ) : (
                        'Complete Check-In'
                    )}
                </button>
            </div>
        </div>
    )
}