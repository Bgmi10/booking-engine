import React, { useState, useEffect } from 'react';
import { RiCalendarLine } from 'react-icons/ri';

interface SafariDateTimePickerProps {
  value: { date: string; time: string };
  onChange: (value: { date: string; time: string }) => void;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

export default function SafariDateTimePicker({
  value,
  onChange,
  required = false,
  minDate,
  maxDate,
}: SafariDateTimePickerProps) {
  const [isSafari, setIsSafari] = useState(false);
  const [localDate, setLocalDate] = useState(value.date || '');
  const [localTime, setLocalTime] = useState(value.time || '');

  useEffect(() => {
    // Detect Safari browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const safari = userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1;
    setIsSafari(safari);
  }, []);

  useEffect(() => {
    setLocalDate(value.date || '');
    setLocalTime(value.time || '');
  }, [value.date, value.time]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLocalDate(newDate);
    onChange({ date: newDate, time: localTime });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newTime = e.target.value;
    setLocalTime(newTime);
    onChange({ date: localDate, time: newTime });
  };

  // For Safari, we'll use a more compatible approach
  if (isSafari) {
    // Generate hour options (00-23)
    const hours = Array.from({ length: 24 }, (_, i) => 
      i.toString().padStart(2, '0')
    );
    
    // Generate minute options (00-59, in 15-minute intervals for better UX)
    const minutes = ['00', '15', '30', '45'];

    const [selectedHour, selectedMinute] = localTime.split(':');

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <RiCalendarLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
            <input
              type="date"
              value={localDate}
              onChange={handleDateChange}
              min={minDate}
              max={maxDate}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={required}
              style={{ 
                WebkitAppearance: 'none',
                MozAppearance: 'textfield',
                position: 'relative'
              }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Time <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={selectedHour || '12'}
              onChange={(e) => {
                const newTime = `${e.target.value}:${selectedMinute || '00'}`;
                setLocalTime(newTime);
                onChange({ date: localDate, time: newTime });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={required}
            >
              <option value="">Hour</option>
              {hours.map(hour => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <span className="flex items-center text-gray-500">:</span>
            <select
              value={selectedMinute || '00'}
              onChange={(e) => {
                const newTime = `${selectedHour || '12'}:${e.target.value}`;
                setLocalTime(newTime);
                onChange({ date: localDate, time: newTime });
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={required}
            >
              <option value="">Min</option>
              {minutes.map(min => (
                <option key={min} value={min}>
                  {min}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // For non-Safari browsers, use the standard inputs
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Event Date <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <RiCalendarLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={localDate}
            onChange={handleDateChange}
            min={minDate}
            max={maxDate}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={required}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Event Time <span className="text-red-500">*</span>
        </label>
        <input
          type="time"
          value={localTime}
          onChange={handleTimeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
        />
      </div>
    </div>
  );
}