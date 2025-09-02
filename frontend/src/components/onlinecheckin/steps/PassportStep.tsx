import React, { useState, useEffect, useRef } from "react"
import { ChevronDown, AlertCircle, Search, Calendar } from "lucide-react"
import { countries } from "../../../utils/constants"

interface PassportStepProps {
    formData: any
    updateFormData: (data: any) => void
    onNext: () => void
    onSubmit: () => void
    isLastStep: boolean
}

export const PassportStep = ({ formData, updateFormData, onNext }: PassportStepProps) => {
    const [showCountryDropdown, setShowCountryDropdown] = useState(false)
    const [countrySearch, setCountrySearch] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    
    const countryDropdownRef = useRef<HTMLDivElement>(null)

    const selectedCountry = countries.find(country => 
        country.name === formData.passportIssuedCountry || country.code === formData.passportIssuedCountry
    ) || countries[0]

    // Improved search for countries - prioritize exact matches and common searches
    const filteredCountries = React.useMemo(() => {
        if (!countrySearch.trim()) return countries.slice().sort((a, b) => a.name.localeCompare(b.name))
        
        const searchLower = countrySearch.toLowerCase().trim()
        return countries
            .filter(country =>
                country.name.toLowerCase().includes(searchLower) ||
                country.code.toLowerCase().includes(searchLower)
            )
            .sort((a, b) => {
                const aName = a.name.toLowerCase()
                const bName = b.name.toLowerCase()
                
                // Exact match first
                if (aName === searchLower) return -1
                if (bName === searchLower) return 1
                
                // Starts with search term
                if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1
                if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1
                
                // Shorter names with the search term first (more relevant)
                const aDistance = aName.indexOf(searchLower)
                const bDistance = bName.indexOf(searchLower)
                if (aDistance !== bDistance) return aDistance - bDistance
                
                // Alphabetical
                return aName.localeCompare(bName)
            })
    }, [countrySearch])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setShowCountryDropdown(false)
                setCountrySearch('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.passportNumber.trim()) {
            newErrors.passportNumber = 'Passport number is required'
        }
        
        if (!formData.passportIssuedCountry) {
            newErrors.passportIssuedCountry = 'Issuing country is required'
        }
        
        if (!formData.passportExpiry) {
            newErrors.passportExpiry = 'Expiration date is required'
        } else {
            const expiryDate = new Date(formData.passportExpiry)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            if (expiryDate <= today) {
                newErrors.passportExpiry = 'Passport must not be expired'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleContinue = () => {
        if (validateForm()) {
            onNext()
        }
    }

    const handleInputChange = (field: string, value: string) => {
        updateFormData({ [field]: value })
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' })
        }
    }

    const handleCountrySelect = (country: any) => {
        updateFormData({ passportIssuedCountry: country.name })
        setShowCountryDropdown(false)
        setCountrySearch('')
        if (errors.passportIssuedCountry) {
            setErrors({ ...errors, passportIssuedCountry: '' })
        }
    }

    const formatDateInput = (value: string) => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '')
        
        // Apply DD/MM/YYYY format with smart validation
        if (numbers.length <= 2) {
            // Day validation - allow 01-31, but also allow incomplete entries
            if (numbers.length === 1) {
                // Auto-pad single digit days when user continues typing
                const day = parseInt(numbers)
                if (day >= 4) return `0${numbers}` // Auto-pad for 4-9
                return numbers
            }
            if (numbers.length === 2) {
                const day = parseInt(numbers)
                if (day === 0 || day > 31) return numbers.slice(0, 1)
            }
            return numbers
        } else if (numbers.length <= 4) {
            let day = numbers.slice(0, 2)
            let month = numbers.slice(2)
            
            // Auto-pad day if it's a single digit when month starts being entered
            if (day.length === 1) {
                day = `0${day}`
            }
            
            // Auto-pad month if it's a single digit and user continues typing
            if (month.length === 1) {
                const monthNum = parseInt(month)
                if (monthNum >= 2) {
                    month = `0${month}`
                }
            }
            
            // Month validation - allow 01-12, but also allow incomplete entries
            if (month.length === 2) {
                const monthNum = parseInt(month)
                if (monthNum === 0 || monthNum > 12) return `${day}/`
            }
            return `${day}/${month}`
        } else {
            let day = numbers.slice(0, 2)
            let month = numbers.slice(2, 4)
            const year = numbers.slice(4, 8)
            
            // Auto-pad day if it's a single digit
            if (day.length === 1) {
                day = `0${day}`
            }
            
            // Auto-pad month if it's a single digit
            if (month.length === 1) {
                month = `0${month}`
            }
            
            // Month validation for completed month
            if (month.length === 2) {
                const monthNum = parseInt(month)
                if (monthNum === 0 || monthNum > 12) return `${day}/`
            }
            
            return `${day}/${month}/${year}`
        }
    }

    const handleDateInput = (value: string) => {
        const formatted = formatDateInput(value)
        
        // Convert to ISO format for backend only when we have a complete date
        if (formatted.length === 10 && formatted.includes('/')) {
            const [day, month, year] = formatted.split('/')
            
            // Validate each component
            const dayNum = parseInt(day)
            const monthNum = parseInt(month)
            const yearNum = parseInt(year)
            
            // Smart year validation - allow 1900-2100
            if (yearNum < 1900 || yearNum > 2100) {
                updateFormData({ passportExpiryDisplay: formatted })
                return
            }
            
            // Month validation
            if (monthNum < 1 || monthNum > 12) {
                updateFormData({ passportExpiryDisplay: formatted })
                return
            }
            
            // Day validation
            if (dayNum < 1 || dayNum > 31) {
                updateFormData({ passportExpiryDisplay: formatted })
                return
            }
            
            // Create date and validate it's real (handles leap years, month lengths, etc.)
            const date = new Date(yearNum, monthNum - 1, dayNum)
            
            if (date.getFullYear() === yearNum && 
                date.getMonth() === monthNum - 1 && 
                date.getDate() === dayNum) {
                // Valid date - store both formats
                updateFormData({ 
                    passportExpiry: date.toISOString().split('T')[0],
                    passportExpiryDisplay: formatted
                })
            } else {
                // Invalid date (like Feb 30)
                updateFormData({ passportExpiryDisplay: formatted })
            }
        } else {
            // Incomplete date - just store the display value
            updateFormData({ passportExpiryDisplay: formatted })
        }
    }

    // Check if passport is expiring soon (within 6 months)
    const checkPassportExpiry = () => {
        if (formData.passportExpiry) {
            const expiryDate = new Date(formData.passportExpiry)
            const today = new Date()
            const sixMonthsFromNow = new Date()
            sixMonthsFromNow.setMonth(today.getMonth() + 6)
            
            if (expiryDate <= sixMonthsFromNow && expiryDate > today) {
                return "Your passport expires within 6 months. Please check travel requirements."
            }
        }
        return null
    }

    const expiryWarning = checkPassportExpiry()

    return (
        <div className="space-y-6">
            {/* Passport Number */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                    className={`w-full px-4 py-3.5 border rounded-xl bg-white font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.passportNumber ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    placeholder="Enter passport number"
                    maxLength={20}
                />
                {errors.passportNumber && <p className="mt-1 text-sm text-red-600">{errors.passportNumber}</p>}
            </div>

            {/* Issuing Country */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issuing country <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={countryDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer ${errors.passportIssuedCountry ? 'border-red-300' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            {selectedCountry.image ? (
                                <img src={selectedCountry.image} alt={selectedCountry.name} className="w-6 h-4 object-cover rounded" />
                            ) : (
                                <span className="text-xl">{selectedCountry.flag}</span>
                            )}
                            <span className="text-gray-800 font-medium">{selectedCountry.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${showCountryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showCountryDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 z-50 transition-all duration-300 transform opacity-100 scale-100">
                            <div className="p-3 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search countries..."
                                        value={countrySearch}
                                        onChange={(e) => setCountrySearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                                    />
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {filteredCountries.map((country) => (
                                    <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => handleCountrySelect(country)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 cursor-pointer"
                                    >
                                        {country.image ? (
                                            <img src={country.image} alt={country.name} className="w-6 h-4 object-cover rounded" />
                                        ) : (
                                            <span className="text-xl">{country.flag}</span>
                                        )}
                                        <span className="text-gray-800">{country.name}</span>
                                    </button>
                                ))}
                                {filteredCountries.length === 0 && (
                                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                        No countries found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {errors.passportIssuedCountry && <p className="mt-1 text-sm text-red-600">{errors.passportIssuedCountry}</p>}
            </div>

            {/* Expiration Date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={formData.passportExpiryDisplay || (formData.passportExpiry ? new Date(formData.passportExpiry).toLocaleDateString('en-GB') : '')}
                        onChange={(e) => handleDateInput(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        className={`w-full pl-10 pr-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.passportExpiry ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    />
                </div>
                {errors.passportExpiry && <p className="mt-1 text-sm text-red-600">{errors.passportExpiry}</p>}
                
                {/* Expiry Warning */}
                {expiryWarning && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-800">{expiryWarning}</p>
                    </div>
                )}
            </div>
            {/* Continue Button */}
            <div className="pt-6">
                <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 cursor-pointer transition-all"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}