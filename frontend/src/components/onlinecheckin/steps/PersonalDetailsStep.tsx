import React, { useState, useEffect, useRef } from "react"
import { ChevronDown, Search, Calendar } from "lucide-react"
import { countries } from "../../../utils/constants"

interface PersonalDetailsStepProps {
    formData: any
    updateFormData: (data: any) => void
    onNext: () => void
    onSubmit: () => void
    isLastStep: boolean
}

const purposes = [
    { id: 'BUSINESS', label: 'Business' },
    { id: 'LEISURE', label: 'Leisure' },
    { id: 'EDUCATION', label: 'Education' },
]

export const PersonalDetailsStep = ({ formData, updateFormData, onNext }: PersonalDetailsStepProps) => {
    const [showCountryDropdown, setShowCountryDropdown] = useState(false)
    const [countrySearch, setCountrySearch] = useState('')
    const [showPhoneCountryDropdown, setShowPhoneCountryDropdown] = useState(false)
    const [phoneCountrySearch, setPhoneCountrySearch] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    
    const nationalityDropdownRef = useRef<HTMLDivElement>(null)
    const phoneDropdownRef = useRef<HTMLDivElement>(null)

    const selectedNationalityCountry = countries.find(country => 
        country.name === formData.nationality || country.code === formData.nationality
    ) || countries[0]

    // Parse phone number from backend format like "+91784544250"
    const parsePhoneNumber = (phone: string) => {
        if (!phone) return { dialCode: '+1', number: '' }
        
        for (const country of countries) {
            if (phone.startsWith(country.dial_code)) {
                return {
                    dialCode: country.dial_code,
                    number: phone.substring(country.dial_code.length).trim()
                }
            }
        }
        return { dialCode: '+1', number: phone }
    }

    const { dialCode, number } = parsePhoneNumber(formData.phone)
    const selectedPhoneCountry = countries.find(country => 
        country.dial_code === dialCode
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

    const filteredPhoneCountries = React.useMemo(() => {
        if (!phoneCountrySearch.trim()) return countries.slice().sort((a, b) => a.name.localeCompare(b.name))
        
        const searchLower = phoneCountrySearch.toLowerCase().trim()
        return countries
            .filter(country =>
                country.name.toLowerCase().includes(searchLower) ||
                country.code.toLowerCase().includes(searchLower) ||
                country.dial_code.includes(searchLower)
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
    }, [phoneCountrySearch])

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
                setShowCountryDropdown(false)
                setCountrySearch('')
            }
            if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
                setShowPhoneCountryDropdown(false)
                setPhoneCountrySearch('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.nationality) newErrors.nationality = 'Nationality is required'
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
        if (!formData.gender) newErrors.gender = 'Gender is required'
        if (!formData.placeOfBirth.trim()) newErrors.placeOfBirth = 'Place of birth is required'
        if (!formData.city.trim()) newErrors.city = 'City is required'

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

    const handleNationalitySelect = (country: any) => {
        updateFormData({ nationality: country.name })
        setShowCountryDropdown(false)
        setCountrySearch('')
        if (errors.nationality) {
            setErrors({ ...errors, nationality: '' })
        }
    }

    const handlePhoneCountrySelect = (country: any) => {
        updateFormData({ phone: `${country.dial_code}${number}` })
        setShowPhoneCountryDropdown(false)
        setPhoneCountrySearch('')
        if (errors.phone) {
            setErrors({ ...errors, phone: '' })
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
                updateFormData({ dateOfBirthDisplay: formatted })
                return
            }
            
            // Month validation
            if (monthNum < 1 || monthNum > 12) {
                updateFormData({ dateOfBirthDisplay: formatted })
                return
            }
            
            // Day validation
            if (dayNum < 1 || dayNum > 31) {
                updateFormData({ dateOfBirthDisplay: formatted })
                return
            }
            
            // Create date and validate it's real (handles leap years, month lengths, etc.)
            const date = new Date(yearNum, monthNum - 1, dayNum)
            
            if (date.getFullYear() === yearNum && 
                date.getMonth() === monthNum - 1 && 
                date.getDate() === dayNum) {
                // Valid date - store both formats
                updateFormData({ 
                    dateOfBirth: date.toISOString().split('T')[0],
                    dateOfBirthDisplay: formatted
                })
            } else {
                // Invalid date (like Feb 30)
                updateFormData({ dateOfBirthDisplay: formatted })
            }
        } else {
            // Incomplete date - just store the display value
            updateFormData({ dateOfBirthDisplay: formatted })
        }
    }

    return (
        <div className="space-y-6">
            {/* Nationality */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={nationalityDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer ${errors.nationality ? 'border-red-300' : 'border-gray-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            {selectedNationalityCountry.image ? (
                                <img src={selectedNationalityCountry.image} alt={selectedNationalityCountry.name} className="w-6 h-4 object-cover rounded" />
                            ) : (
                                <span className="text-xl">{selectedNationalityCountry.flag}</span>
                            )}
                            <span className="text-gray-800 font-medium">{selectedNationalityCountry.name}</span>
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
                                        onClick={() => handleNationalitySelect(country)}
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
                {errors.nationality && <p className="mt-1 text-sm text-red-600">{errors.nationality}</p>}
            </div>

            {/* First Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    First name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.firstName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    placeholder="Enter your first name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            {/* Middle Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle name
                </label>
                <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 hover:border-gray-300 transition-all duration-300"
                    placeholder="Enter your middle name (optional)"
                />
            </div>

            {/* Last Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.lastName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    placeholder="Enter your last name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>

            {/* Phone */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telephone <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                    <div className="relative w-32" ref={phoneDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowPhoneCountryDropdown(!showPhoneCountryDropdown)}
                            className={`w-full flex items-center gap-2 px-3 py-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer ${errors.phone ? 'border-red-300' : 'border-gray-200'}`}
                        >
                            {selectedPhoneCountry.image ? (
                                <img src={selectedPhoneCountry.image} alt={selectedPhoneCountry.name} className="w-5 h-3 object-cover rounded" />
                            ) : (
                                <span className="text-sm">{selectedPhoneCountry.flag}</span>
                            )}
                            <span className="text-sm font-medium">{selectedPhoneCountry.dial_code}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-300 ${showPhoneCountryDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showPhoneCountryDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 z-50 transition-all duration-300 transform opacity-100 scale-100">
                                <div className="p-3 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={phoneCountrySearch}
                                            onChange={(e) => setPhoneCountrySearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredPhoneCountries.map((country) => (
                                        <button
                                            key={country.code}
                                            type="button"
                                            onClick={() => handlePhoneCountrySelect(country)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 cursor-pointer"
                                        >
                                            {country.image ? (
                                                <img src={country.image} alt={country.name} className="w-5 h-3 object-cover rounded" />
                                            ) : (
                                                <span className="text-sm">{country.flag}</span>
                                            )}
                                            <span className="text-sm font-medium">{country.dial_code}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <input
                        type="tel"
                        value={number}
                        onChange={(e) => {
                            const dialCode = selectedPhoneCountry.dial_code
                            const inputNumber = e.target.value
                            handleInputChange('phone', `${dialCode}${inputNumber}`)
                        }}
                        className={`flex-1 px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.phone ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                        placeholder="Phone number"
                    />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            {/* Date of Birth */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of birth <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={formData.dateOfBirthDisplay || (formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('en-GB') : '')}
                        onChange={(e) => handleDateInput(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        className={`w-full pl-10 pr-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.dateOfBirth ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    />
                </div>
                {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
            </div>

            {/* Gender */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => handleInputChange('gender', 'MALE')}
                        className={`flex items-center justify-center px-4 py-3.5 border rounded-xl transition-all duration-300 cursor-pointer ${formData.gender === 'MALE'
                                ? 'border-gray-600 bg-gray-600 text-white'
                                : errors.gender
                                ? 'border-red-300'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <span className="text-sm font-medium">Male</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleInputChange('gender', 'FEMALE')}
                        className={`flex items-center justify-center px-4 py-3.5 border rounded-xl transition-all duration-300 cursor-pointer ${formData.gender === 'FEMALE'
                                ? 'border-gray-600 bg-gray-600 text-white'
                                : errors.gender
                                ? 'border-red-300'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <span className="text-sm font-medium">Female</span>
                    </button>
                </div>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
            </div>

            {/* Place of Birth */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Place of birth <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.placeOfBirth}
                    onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.placeOfBirth ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    placeholder="Enter your place of birth"
                />
                {errors.placeOfBirth && <p className="mt-1 text-sm text-red-600">{errors.placeOfBirth}</p>}
            </div>

            {/* City */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current City <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.city ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                    placeholder="Enter your current city"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
            </div>

            {/* Car Number Plate */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Car number plate
                </label>
                <input
                    type="text"
                    value={formData.carNumberPlate}
                    onChange={(e) => handleInputChange('carNumberPlate', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 hover:border-gray-300 transition-all duration-300"
                    placeholder="Enter your car number plate (optional)"
                />
            </div>

            {/* Reservation Purpose */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                    Reservation purpose
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {purposes.map((purpose) => (
                        <button
                            key={purpose.id}
                            type="button"
                            onClick={() => handleInputChange('reservationPurpose', purpose.id)}
                            className={`flex items-center justify-center px-4 py-3.5 border rounded-xl transition-all duration-300 cursor-pointer ${formData.reservationPurpose === purpose.id
                                    ? 'border-gray-600 bg-gray-600 text-white'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <span className="text-sm font-medium">{purpose.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Continue Button */}
            <div className="pt-6">
                <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 cursor-pointer"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}