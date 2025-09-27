import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface SafariTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  className?: string;
  placeholder?: string;
}

export default function SafariTimePicker({
  value,
  onChange,
  required = false,
  label,
  className = '',
  placeholder = 'Select time'
}: SafariTimePickerProps) {
  const [isSafari, setIsSafari] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');

  useEffect(() => {
    // Detect Safari browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const safari = userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1;
    setIsSafari(safari);
    
    // Parse initial value
    if (value) {
      const [hour, minute] = value.split(':');
      setSelectedHour(hour || '');
      setSelectedMinute(minute || '');
    }
  }, [value]);

  const handleHourChange = (newHour: string) => {
    setSelectedHour(newHour);
    if (newHour && selectedMinute) {
      onChange(`${newHour}:${selectedMinute}`);
    }
  };

  const handleMinuteChange = (newMinute: string) => {
    setSelectedMinute(newMinute);
    if (selectedHour && newMinute) {
      onChange(`${selectedHour}:${newMinute}`);
    }
  };

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );
  
  // Generate minute options (00-59, in 5-minute intervals for better UX)
  const minutes = Array.from({ length: 12 }, (_, i) => 
    (i * 5).toString().padStart(2, '0')
  );

  // For Safari, use dropdowns
  if (isSafari) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={selectedHour}
              onChange={(e) => handleHourChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required={required}
            >
              <option value="">HH</option>
              {hours.map(hour => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </div>
          <span className="text-gray-500 font-semibold">:</span>
          <select
            value={selectedMinute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            required={required}
          >
            <option value="">MM</option>
            {minutes.map(min => (
              <option key={min} value={min}>
                {min}
              </option>
            ))}
          </select>
        </div>
        {!value && placeholder && (
          <p className="mt-1 text-xs text-gray-500">{placeholder}</p>
        )}
      </div>
    );
  }

  // For non-Safari browsers, use the standard time input
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}