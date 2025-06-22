import React from "react";
import DatePicker from "react-datepicker";
import { differenceInHours } from "date-fns";

interface ExpirySelectorProps {
  expiryMode: "hours" | "date";
  setExpiryMode: (mode: "hours" | "date") => void;
  expiresInHours: number;
  setExpiresInHours: (hours: number) => void;
  expiryDate: Date;
  setExpiryDate: (date: Date) => void;
  loadingAction: boolean;
}

const ExpirySelector: React.FC<ExpirySelectorProps> = ({
  expiryMode,
  setExpiryMode,
  expiresInHours,
  setExpiresInHours,
  expiryDate,
  setExpiryDate,
  loadingAction,
}) => {
  return (
    <div className="p-10 -mt-10">
      <div className="mb-4">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              expiryMode === "hours"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setExpiryMode("hours")}
            disabled={loadingAction}
          >
            Hours
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              expiryMode === "date"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setExpiryMode("date")}
            disabled={loadingAction}
          >
            Specific Date
          </button>
        </div>
      </div>
      {expiryMode === "hours" ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Link Expiration Time (Hours)
          </label>
          <input
            type="number"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Math.max(1, Number.parseInt(e.target.value)))}
            min="1"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
          <p className="mt-1 text-sm text-gray-500">
            Link will expire in {expiresInHours} hours ({Math.floor(expiresInHours / 24)} days and {expiresInHours % 24} hours)
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Link Expiration Date</label>
          <DatePicker
            selected={expiryDate}
            onChange={(date: Date | null) => date && setExpiryDate(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={30}
            dateFormat="MMMM d, yyyy h:mm aa"
            minDate={new Date()}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
          <p className="mt-1 text-sm text-gray-500">
            Link will expire on the selected date and time ({Math.floor(differenceInHours(expiryDate, new Date()))} hours from now)
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpirySelector; 