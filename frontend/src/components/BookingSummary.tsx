/* eslint-disable @typescript-eslint/no-explicit-any */
import { differenceInDays, format } from "date-fns";
import { User, Calendar } from "lucide-react";

export default function BookingSummary({ bookingData, setCurrentStep }: { bookingData: any, setCurrentStep: (step: number) => void }) {
  const nightsSelected = bookingData.checkOut ? differenceInDays(new Date(bookingData.checkOut), new Date(bookingData.checkIn))
      : 0
      
  const formattedCheckIn = bookingData.checkIn ? format(new Date(bookingData.checkIn), "EEE dd/MM/yyyy") : ""
  const formattedCheckOut = bookingData.checkOut ? format(new Date(bookingData.checkOut), "EEE dd/MM/yyyy") : ""

  return <div className=" bg-white p-5 shadow-sm rounded-lg mb-6 mx-4">
  <div className="flex flex-col md:flex-row justify-between items-center">
    <div className="flex flex-col md:flex-row gap-6 mb-4 md:mb-0">
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 p-2 rounded-full">
          <Calendar className="h-5 w-5 text-gray-700" />
        </div>
        <div>
          <div className="text-gray-700 font-medium">
            {nightsSelected} {nightsSelected === 1 ? "Night" : "Nights"}
          </div>
          <div className="text-sm text-gray-500">
            {formattedCheckIn} → {formattedCheckOut}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 p-2 rounded-full">
          <User className="h-5 w-5 text-gray-700" />
        </div>
        <div>
          <div className="text-gray-700 font-medium">
            {bookingData.adults} {bookingData.adults === 1 ? "Guest" : "Guests"}
          </div>
          <div className="text-sm text-gray-500">
            {bookingData.adults} {bookingData.adults === 1 ? "Adult" : "Adults"}
          </div>
        </div>
      </div>
    </div>
    <button
      className=" text-black border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={() => setCurrentStep(1)}
    >
      Change dates
    </button>
  </div>
</div>
}

