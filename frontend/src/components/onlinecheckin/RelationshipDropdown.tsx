import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

const RELATIONSHIP_TYPES = [
  { value: 'HUSBAND', label: 'Husband' },
  { value: 'WIFE', label: 'Wife' },
  { value: 'SON', label: 'Son' },
  { value: 'DAUGHTER', label: 'Daughter' },
  { value: 'FATHER', label: 'Father' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'FRIEND', label: 'Friend' },
  { value: 'OTHER_RELATIVE', label: 'Other Relative' },
]

interface RelationshipDropdownProps {
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
}

export const RelationshipDropdown: React.FC<RelationshipDropdownProps> = ({
  value,
  onChange,
  error,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedRelationship = RELATIONSHIP_TYPES.find(type => type.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (relationshipValue: string) => {
    onChange(relationshipValue)
    setIsOpen(false)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Relationship {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 cursor-pointer ${
            error ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className={`${selectedRelationship ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
            {selectedRelationship ? selectedRelationship.label : 'Select relationship'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 z-50 transition-all duration-300 transform opacity-100 scale-100">
            <div className="max-h-64 overflow-y-auto">
              {RELATIONSHIP_TYPES.map((relationship) => (
                <button
                  key={relationship.value}
                  type="button"
                  onClick={() => handleSelect(relationship.value)}
                  className={`w-full flex items-center px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 cursor-pointer ${
                    value === relationship.value ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-800'
                  }`}
                >
                  {relationship.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}