import { useState } from "react"
import { ChevronLeft, X, Check } from "lucide-react"
import { baseUrl } from "../../utils/constants"
import toast from 'react-hot-toast'
import { PersonalDetailsStep } from "./steps/PersonalDetailsStep"
import { PassportStep } from "./steps/PassportStep"
import { TermsStep } from "./steps/TermsStep"
import type { CustomerData, Enhancement } from "../../types/types"

interface OnlineCheckInFormProps {
    customer: {
        customer: CustomerData,
        isMainGuest: boolean;
        booking: {
            id: string
            checkIn: string
            checkOut: string
            totalGuests: number
            room: {
                id: string
                name: string
                description: string
            }
        }
    };
    selectedEnhancements?: Enhancement[];
    primaryBooking?: any;
}

export const OnlineCheckInForm = ({ customer, selectedEnhancements = [], primaryBooking }: OnlineCheckInFormProps) => {
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState({
        // Personal details
        nationality: customer.customer.guestNationality || '',
        firstName: customer.customer.guestFirstName || '',
        middleName: customer.customer.guestMiddleName|| '',
        lastName: customer.customer.guestLastName || '',
        phone: customer.customer.guestPhone || '',
        dateOfBirth: customer.customer.dob ? new Date(customer.customer.dob).toISOString().split('T')[0] : '',
        gender: customer.customer.gender || '',
        placeOfBirth: customer.customer.placeOfBirth || '',
        city: customer.customer.city || '',
        // Passport/ID Card details
        passportNumber: customer.customer.passportNumber || '',
        passportIssuedCountry: customer.customer.passportIssuedCountry || '',
        passportExpiry: customer.customer.passportExpiry ? new Date(customer.customer.passportExpiry).toISOString().split('T')[0] : '',
        idCard: customer.customer.idCard || '',
        documentType: customer.customer.idCard ? 'idCard' : 'passport',
        // Terms
        tcAgreed: customer.customer.tcAgreed || false,
        receiveMarketingEmail: customer.customer.receiveMarketingEmail !== undefined ? customer.customer.receiveMarketingEmail : true,
        carNumberPlate: customer.customer.carNumberPlate || '',
    })

    const totalSteps = 3

    const steps = [
        { id: 1, title: "Personal details", component: PersonalDetailsStep },
        { id: 2, title: "Identity Document", component: PassportStep },
        { id: 3, title: "Terms and conditions", component: TermsStep }
    ]

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleClose = () => {
        window.location.href = '/online-checkin/home'
    }

    const updateFormData = (data: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...data }))
    }

    const handleSubmit = async () => {
        try {
            // Update customer data via API
            const response = await fetch(`${baseUrl}/customers/profile/${customer.customer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    middleName: formData.middleName,
                    nationality: formData.nationality,
                    phone: formData.phone,
                    dob: formData.dateOfBirth,
                    gender: formData.gender,
                    placeOfBirth: formData.placeOfBirth,
                    city: formData.city,
                    passportNumber: formData.documentType === 'passport' ? formData.passportNumber : undefined,
                    passportIssuedCountry: formData.documentType === 'passport' ? formData.passportIssuedCountry : undefined,
                    passportExpiry: formData.documentType === 'passport' ? formData.passportExpiry : undefined,
                    idCard: formData.documentType === 'idCard' ? formData.idCard : undefined,
                    tcAgreed: formData.tcAgreed,
                    receiveMarketingEmail: formData.receiveMarketingEmail,
                    carNumberPlate: formData.carNumberPlate,
                    // Include selected enhancements and booking ID
                    selectedEnhancements: selectedEnhancements.map(e => ({
                        id: e.id,
                        quantity: e.pricingType === 'PER_GUEST' && primaryBooking 
                            ? primaryBooking.totalGuests 
                            : 1,
                        notes: null
                    })),
                    bookingId: primaryBooking?.id // Pass the primary booking ID
                })
            });

            if (response.ok) {
                // Check if user is main guest to determine redirect
                if (customer.isMainGuest) {
                    // Main guest - redirect to guest management page
                    window.location.href = '/online-checkin/manage-guests';
                } else {
                    // Invited guest - redirect to success page
                    window.location.href = '/online-checkin/success';
                }
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to update customer information');
            }
        } catch (error) {
            console.error('Error submitting check-in:', error);
            toast.error('Failed to submit check-in information');
        }
    }

    const getCurrentStepComponent = () => {
        const StepComponent = steps[currentStep - 1].component
        return (
            <StepComponent
                formData={formData}
                updateFormData={updateFormData}
                onNext={handleNext}
                onSubmit={handleSubmit}
                isLastStep={currentStep === totalSteps}
            />
        )
    }

    return (
        <div className="py-2 sm:py-8 px-2 sm:px-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button 
                        onClick={handlePrevious}
                        className={`p-3 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors ${
                            currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={currentStep === 1}
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-900 mt-1">
                            {steps[currentStep - 1].title}
                        </h2>
                    </div>

                    <button 
                        onClick={handleClose}
                        className="p-3 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-8 flex justify-center">
                    <div className="flex items-center mb-2">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    currentStep > step.id
                                        ? 'bg-blue-600 text-white'
                                        : currentStep === step.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {currentStep > step.id ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`w-16 h-1 mx-2 rounded ${
                                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current Step Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
                    {getCurrentStepComponent()}
                </div>
            </div>
        </div>
    )
}