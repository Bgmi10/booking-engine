import React, { useState, useEffect, useRef } from "react"
import { X, ChevronDown, Search, Calendar } from "lucide-react"
import { baseUrl } from "../../utils/constants"
import { countries } from "../../utils/constants"
import toast from 'react-hot-toast'

interface GuestModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  roomName: string
  onGuestAdded: (guestData: any) => void
}

export const GuestModal: React.FC<GuestModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  roomName,
  onGuestAdded
}) => {
  const [activeTab, setActiveTab] = useState<'enter' | 'invite'>('enter')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Enter Details Form State
  const [enterDetailsStep, setEnterDetailsStep] = useState<'personal' | 'passport'>('personal')
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false)
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [showPhoneCountryDropdown, setShowPhoneCountryDropdown] = useState(false)
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('')
  const [showPassportCountryDropdown, setShowPassportCountryDropdown] = useState(false)
  const [passportCountrySearch, setPassportCountrySearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const nationalityDropdownRef = useRef<HTMLDivElement>(null)
  const phoneDropdownRef = useRef<HTMLDivElement>(null)
  const passportCountryDropdownRef = useRef<HTMLDivElement>(null)
  const [enterDetailsData, setEnterDetailsData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    telephone: '+1',
    nationality: '',
    dateOfBirth: '',
    dateOfBirthDisplay: '',
    city: '',
    passportNumber: '',
    passportExpiryDate: '',
    passportExpiryDisplay: '',
    passportIssuedCountry: ''
  })

  // Invite Guest Form State
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })

  const handleEnterDetailsSubmit = async () => {
    if (enterDetailsStep === 'personal') {
      // Validate personal step before moving to passport step
      if (!validatePersonalStep()) {
        return
      }
      // Move to passport step
      setEnterDetailsStep('passport')
      return
    }

    // Submit complete guest details
    setIsSubmitting(true)
    try {
      const response = await fetch(`${baseUrl}/customers/online-checkin/guests/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: bookingId,
          firstName: enterDetailsData.firstName,
          lastName: enterDetailsData.lastName,
          middleName: enterDetailsData.middleName,
          email: enterDetailsData.email,
          telephone: enterDetailsData.telephone,
          nationality: enterDetailsData.nationality,
          dateOfBirth: enterDetailsData.dateOfBirth,
          city: enterDetailsData.city,
          passportNumber: enterDetailsData.passportNumber,
          passportExpiryDate: enterDetailsData.passportExpiryDate,
          passportIssuedCountry: enterDetailsData.passportIssuedCountry
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create guest')
      }

      const data = await response.json()
      onGuestAdded({ type: 'manual', data: data.data })
      toast.success('Guest details saved successfully!')
      onClose()
      
      // Reset form
      setEnterDetailsData({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        telephone: '+1',
        nationality: '',
        dateOfBirth: '',
        dateOfBirthDisplay: '',
        city: '',
        passportNumber: '',
        passportExpiryDate: '',
        passportExpiryDisplay: '',
        passportIssuedCountry: ''
      })
      setEnterDetailsStep('personal')
      
    } catch (error) {
      console.error('Error creating guest:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create guest. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteSubmit = async () => {
    // Validate invite form before submitting
    if (!validateInviteForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${baseUrl}/customers/online-checkin/guests/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: bookingId,
          firstName: inviteData.firstName,
          lastName: inviteData.lastName,
          email: inviteData.email
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send invitation')
      }

      const data = await response.json()
      onGuestAdded({ type: 'invite', data: data.data.guest })
      toast.success('Invitation sent successfully!')
      onClose()
      
      // Reset form
      setInviteData({
        firstName: '',
        lastName: '',
        email: ''
      })
      
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions for nationality dropdown
  const selectedNationalityCountry = countries.find(country => 
    country.name === enterDetailsData.nationality || country.code === enterDetailsData.nationality
  ) || countries[0]

  const selectedPassportCountry = countries.find(country => 
    country.name === enterDetailsData.passportIssuedCountry || country.code === enterDetailsData.passportIssuedCountry
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

  const { dialCode, number } = parsePhoneNumber(enterDetailsData.telephone)
  const selectedPhoneCountry = countries.find(country => 
    country.dial_code === dialCode
  ) || countries[0]

  // Improved search for countries - prioritize exact matches and common searches
  const filteredCountries = React.useMemo(() => {
    if (!nationalitySearch.trim()) return countries.slice().sort((a, b) => a.name.localeCompare(b.name))
    
    const searchLower = nationalitySearch.toLowerCase().trim()
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
  }, [nationalitySearch])

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

  const filteredPassportCountries = React.useMemo(() => {
    if (!passportCountrySearch.trim()) return countries.slice().sort((a, b) => a.name.localeCompare(b.name))
    
    const searchLower = passportCountrySearch.toLowerCase().trim()
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
  }, [passportCountrySearch])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
        setShowNationalityDropdown(false)
        setNationalitySearch('')
      }
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setShowPhoneCountryDropdown(false)
        setPhoneCountrySearch('')
      }
      if (passportCountryDropdownRef.current && !passportCountryDropdownRef.current.contains(event.target as Node)) {
        setShowPassportCountryDropdown(false)
        setPassportCountrySearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNationalitySelect = (country: any) => {
    setEnterDetailsData(prev => ({ ...prev, nationality: country.name }))
    setShowNationalityDropdown(false)
    setNationalitySearch('')
    if (errors.nationality) {
      setErrors({ ...errors, nationality: '' })
    }
  }

  const handlePhoneCountrySelect = (country: any) => {
    setEnterDetailsData(prev => ({ ...prev, telephone: `${country.dial_code}${number}` }))
    setShowPhoneCountryDropdown(false)
    setPhoneCountrySearch('')
    if (errors.telephone) {
      setErrors({ ...errors, telephone: '' })
    }
  }

  const handlePassportCountrySelect = (country: any) => {
    setEnterDetailsData(prev => ({ ...prev, passportIssuedCountry: country.name }))
    setShowPassportCountryDropdown(false)
    setPassportCountrySearch('')
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
    
    // Clear error when user starts typing
    if (errors.dateOfBirth) {
      setErrors({ ...errors, dateOfBirth: '' })
    }
    
    // Convert to ISO format for backend only when we have a complete date
    if (formatted.length === 10 && formatted.includes('/')) {
      const [day, month, year] = formatted.split('/')
      
      // Validate each component
      const dayNum = parseInt(day)
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      // Smart year validation - allow 1900-2100
      if (yearNum < 1900 || yearNum > 2100) {
        setEnterDetailsData(prev => ({ ...prev, dateOfBirthDisplay: formatted }))
        return
      }
      
      // Month validation
      if (monthNum < 1 || monthNum > 12) {
        setEnterDetailsData(prev => ({ ...prev, dateOfBirthDisplay: formatted }))
        return
      }
      
      // Day validation
      if (dayNum < 1 || dayNum > 31) {
        setEnterDetailsData(prev => ({ ...prev, dateOfBirthDisplay: formatted }))
        return
      }
      
      // Create date and validate it's real (handles leap years, month lengths, etc.)
      const date = new Date(yearNum, monthNum - 1, dayNum)
      
      if (date.getFullYear() === yearNum && 
          date.getMonth() === monthNum - 1 && 
          date.getDate() === dayNum) {
        // Valid date - store both formats
        setEnterDetailsData(prev => ({ 
          ...prev,
          dateOfBirth: date.toISOString().split('T')[0],
          dateOfBirthDisplay: formatted
        }))
      } else {
        // Invalid date (like Feb 30)
        setEnterDetailsData(prev => ({ ...prev, dateOfBirthDisplay: formatted }))
      }
    } else {
      // Incomplete date - just store the display value
      setEnterDetailsData(prev => ({ ...prev, dateOfBirthDisplay: formatted }))
    }
  }

  const handlePassportExpiryInput = (value: string) => {
    const formatted = formatDateInput(value)
    
    // Clear error when user starts typing
    if (errors.passportExpiryDate) {
      setErrors({ ...errors, passportExpiryDate: '' })
    }
    
    // Convert to ISO format for backend only when we have a complete date
    if (formatted.length === 10 && formatted.includes('/')) {
      const [day, month, year] = formatted.split('/')
      
      // Validate each component
      const dayNum = parseInt(day)
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      
      // Smart year validation - allow 1900-2100
      if (yearNum < 1900 || yearNum > 2100) {
        setEnterDetailsData(prev => ({ ...prev, passportExpiryDisplay: formatted }))
        return
      }
      
      // Month validation
      if (monthNum < 1 || monthNum > 12) {
        setEnterDetailsData(prev => ({ ...prev, passportExpiryDisplay: formatted }))
        return
      }
      
      // Day validation
      if (dayNum < 1 || dayNum > 31) {
        setEnterDetailsData(prev => ({ ...prev, passportExpiryDisplay: formatted }))
        return
      }
      
      // Create date and validate it's real (handles leap years, month lengths, etc.)
      const date = new Date(yearNum, monthNum - 1, dayNum)
      
      if (date.getFullYear() === yearNum && 
          date.getMonth() === monthNum - 1 && 
          date.getDate() === dayNum) {
        // Valid date - store both formats
        setEnterDetailsData(prev => ({ 
          ...prev,
          passportExpiryDate: date.toISOString().split('T')[0],
          passportExpiryDisplay: formatted
        }))
      } else {
        // Invalid date (like Feb 30)
        setEnterDetailsData(prev => ({ ...prev, passportExpiryDisplay: formatted }))
      }
    } else {
      // Incomplete date - just store the display value
      setEnterDetailsData(prev => ({ ...prev, passportExpiryDisplay: formatted }))
    }
  }

  const validatePersonalStep = () => {
    const newErrors: Record<string, string> = {}

    if (!enterDetailsData.nationality) newErrors.nationality = 'Nationality is required'
    if (!enterDetailsData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!enterDetailsData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!enterDetailsData.email.trim()) newErrors.email = 'Email is required'
    if (!enterDetailsData.telephone.trim() || enterDetailsData.telephone === '+1') newErrors.telephone = 'Phone number is required'
    if (!enterDetailsData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!enterDetailsData.city.trim()) newErrors.city = 'City is required'

    // Email format validation
    if (enterDetailsData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enterDetailsData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateInviteForm = () => {
    const newErrors: Record<string, string> = {}

    if (!inviteData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!inviteData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!inviteData.email.trim()) newErrors.email = 'Email is required'

    // Email format validation
    if (inviteData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setEnterDetailsData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const handleTabChange = (tab: 'enter' | 'invite') => {
    setActiveTab(tab)
    setErrors({}) // Clear all errors when switching tabs
  }

  const handleStepBack = () => {
    setEnterDetailsStep('personal')
    setErrors({}) // Clear errors when going back to personal step
  }

  const handleInviteInputChange = (field: string, value: string) => {
    setInviteData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Guest Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Adding guest to {roomName}</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => handleTabChange('enter')}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'enter'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Enter Details
            </button>
            <button
              onClick={() => handleTabChange('invite')}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invite'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invite Guest
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'enter' ? (
            <div>
              {enterDetailsStep === 'personal' ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  
                  {/* Nationality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={nationalityDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowNationalityDropdown(!showNationalityDropdown)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer ${errors.nationality ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedNationalityCountry.image ? (
                            <img src={selectedNationalityCountry.image} alt={selectedNationalityCountry.name} className="w-6 h-4 object-cover rounded" />
                          ) : (
                            <span className="text-xl">{selectedNationalityCountry.flag}</span>
                          )}
                          <span className="text-gray-800 font-medium">{selectedNationalityCountry.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${showNationalityDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showNationalityDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 z-50 transition-all duration-300 transform opacity-100 scale-100">
                          <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search countries..."
                                value={nationalitySearch}
                                onChange={(e) => setNationalitySearch(e.target.value)}
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
                      required
                      value={enterDetailsData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.firstName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={enterDetailsData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.lastName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle name
                    </label>
                    <input
                      type="text"
                      value={enterDetailsData.middleName}
                      onChange={(e) => handleInputChange('middleName', e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 hover:border-gray-300"
                      placeholder="Enter middle name (optional)"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={enterDetailsData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.email ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telephone
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-32" ref={phoneDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowPhoneCountryDropdown(!showPhoneCountryDropdown)}
                          className="w-full flex items-center gap-2 px-3 py-3.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer"
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
                          handleInputChange('telephone', `${dialCode}${inputNumber}`)
                        }}
                        className={`flex-1 px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.telephone ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                        placeholder="Phone number"
                      />
                    </div>
                    {errors.telephone && <p className="mt-1 text-sm text-red-600">{errors.telephone}</p>}
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
                        value={enterDetailsData.dateOfBirthDisplay || (enterDetailsData.dateOfBirth ? new Date(enterDetailsData.dateOfBirth).toLocaleDateString('en-GB') : '')}
                        onChange={(e) => handleDateInput(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        className={`w-full pl-10 pr-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.dateOfBirth ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      />
                    </div>
                    {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={enterDetailsData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.city ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      placeholder="Enter city"
                    />
                    {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Passport Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passport number
                    </label>
                    <input
                      type="text"
                      value={enterDetailsData.passportNumber}
                      onChange={(e) => setEnterDetailsData(prev => ({ ...prev, passportNumber: e.target.value }))}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 hover:border-gray-300"
                      placeholder="Enter passport number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={enterDetailsData.passportExpiryDisplay || (enterDetailsData.passportExpiryDate ? new Date(enterDetailsData.passportExpiryDate).toLocaleDateString('en-GB') : '')}
                        onChange={(e) => handlePassportExpiryInput(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 hover:border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Issued country
                    </label>
                    <div className="relative" ref={passportCountryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowPassportCountryDropdown(!showPassportCountryDropdown)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer ${errors.passportIssuedCountry ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedPassportCountry.image ? (
                            <img src={selectedPassportCountry.image} alt={selectedPassportCountry.name} className="w-6 h-4 object-cover rounded" />
                          ) : (
                            <span className="text-xl">{selectedPassportCountry.flag}</span>
                          )}
                          <span className="text-gray-800 font-medium">{selectedPassportCountry.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${showPassportCountryDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showPassportCountryDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 z-50 transition-all duration-300 transform opacity-100 scale-100">
                          <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search countries..."
                                value={passportCountrySearch}
                                onChange={(e) => setPassportCountrySearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredPassportCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => handlePassportCountrySelect(country)}
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
                            {filteredPassportCountries.length === 0 && (
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
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Guest</h3>
              <p className="text-sm text-gray-600 mb-6">
                Send an invitation email to the guest. They will receive a link to complete their own check-in details.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteData.firstName}
                  onChange={(e) => handleInviteInputChange('firstName', e.target.value)}
                  className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.firstName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="Enter first name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteData.lastName}
                  onChange={(e) => handleInviteInputChange('lastName', e.target.value)}
                  className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.lastName ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="Enter last name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) => handleInviteInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-300 ${errors.email ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {activeTab === 'enter' && enterDetailsStep === 'passport' && (
              <button
                onClick={handleStepBack}
                className="px-6 py-3.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 hover:border-gray-400"
              >
                Back
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 hover:border-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'enter' ? handleEnterDetailsSubmit : handleInviteSubmit}
              disabled={isSubmitting}
              className="px-6 py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                activeTab === 'enter' 
                  ? (enterDetailsStep === 'personal' ? 'Continue' : 'Save Guest')
                  : 'Send Invitation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}