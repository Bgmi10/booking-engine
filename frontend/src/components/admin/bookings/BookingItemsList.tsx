import React from "react";
import type { Enhancement, Room } from "../../../types/types";
import BookingItemCard from "./BookingItemCard";
import { RiAddLine } from "react-icons/ri";

interface BookingItem {
  checkIn: string;
  checkOut: string;
  selectedRoom: string;
  rooms: number;
  adults: number;
  selectedEnhancements: Enhancement[];
  roomDetails?: Room;
  error?: string;
  selectedRateOption?: any;
  totalPrice?: number;
}

interface BookingItemsListProps {
  bookingItems: BookingItem[];
  rooms: Room[];
  enhancements: Enhancement[];
  loadingAction: boolean;
  loadingRooms: boolean;
  updateBookingItem: (index: number, field: keyof BookingItem, value: any) => void;
  removeBookingItem: (index: number) => void;
  toggleEnhancement: (bookingIndex: number, enhancement: Enhancement) => void;
  getRateOptions: (room: Room) => any[];
  selectRateOption: (bookingIndex: number, rateOption: any) => void;
  addBookingItem: () => void;
}

const BookingItemsList: React.FC<BookingItemsListProps> = ({
  bookingItems,
  rooms,
  enhancements,
  loadingAction,
  loadingRooms,
  updateBookingItem,
  removeBookingItem,
  toggleEnhancement,
  getRateOptions,
  selectRateOption,
  addBookingItem,
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Booking Details</h4>
        <button
          onClick={addBookingItem}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
          disabled={loadingAction}
        >
          <RiAddLine className="mr-1" />
          Add Room
        </button>
      </div>
      {bookingItems.map((item, index) => (
        <BookingItemCard
          key={index}
          item={item}
          index={index}
          rooms={rooms}
          enhancements={enhancements}
          loadingAction={loadingAction}
          loadingRooms={loadingRooms}
          updateBookingItem={updateBookingItem}
          removeBookingItem={removeBookingItem}
          toggleEnhancement={toggleEnhancement}
          getRateOptions={getRateOptions}
          selectRateOption={selectRateOption}
          canRemove={bookingItems.length > 1}
        />
      ))}
    </div>
  );
};

export default BookingItemsList; 