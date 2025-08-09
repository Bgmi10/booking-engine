import { format } from 'date-fns';

interface RateDatePrice {
  date: string;
  roomId: string;
  price: number;
  isActive: boolean;
}

interface RatePolicy {
  id: string;
  name: string;
  basePrice: number;
  rateDatePrices?: RateDatePrice[];
}

interface RoomRate {
  ratePolicy: RatePolicy;
  percentageAdjustment: number;
}

interface Room {
  id: string;
  name: string;
  price: number;
  RoomRate?: RoomRate[];
}

interface PriceBreakdown {
  date: string;
  price: number;
  isOverride: boolean | undefined;
}

interface PriceCalculationResult {
  breakdown: PriceBreakdown[];
  totalPrice: number;
  averagePrice: number;
}

/**
 * Get rate price for a specific date using the rate policy pricing priority system
 * Priority order:
 * 1. Date-specific price overrides (rateDatePrices)
 * 2. Rate policy base price + room percentage adjustment
 * 3. Fallback to room.price (deprecated)
 */
export function getRatePriceForDate(
  ratePolicy: RatePolicy,
  dateStr: string,
  room: Room
): number {
  // First priority: Check if there's a rate-specific price override for this date
  if (ratePolicy.rateDatePrices && ratePolicy.rateDatePrices.length > 0) {
    const rateDatePrice = ratePolicy.rateDatePrices.find(
      (rdp) => rdp.date.split('T')[0] === dateStr && rdp.roomId === room.id
    );

    if (rateDatePrice && rateDatePrice.isActive) {
      return rateDatePrice.price;
    }
  }

  // Second priority: Calculate price using rate policy base price + room percentage adjustment
  const basePrice = ratePolicy.basePrice;
  if (basePrice && basePrice > 0) {
    const roomRate = room.RoomRate?.find((rr) => rr.ratePolicy.id === ratePolicy.id);
    const percentageAdjustment = roomRate?.percentageAdjustment || 0;
    const adjustment = (basePrice * percentageAdjustment) / 100;
    return Math.round((basePrice + adjustment) * 100) / 100;
  }

  // Only fall back to room price if no base price is set
  return room.price || 0;
}

/**
 * Calculate price breakdown for each night in a date range
 * Returns total price, average price per night, and breakdown by date
 */
export function calculatePriceBreakdown(
  checkIn: string,
  checkOut: string,
  room: Room,
  ratePolicy: RatePolicy
): PriceCalculationResult {
  if (!checkIn || !checkOut || !room || !ratePolicy) {
    return {
      breakdown: [],
      totalPrice: 0,
      averagePrice: 0,
    };
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  const breakdown: PriceBreakdown[] = [];
  let totalPrice = 0;
  const currentDate = new Date(checkInDate);

  for (let i = 0; i < nights; i++) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const nightPrice = getRatePriceForDate(ratePolicy, dateStr, room);

    // Check if this is a rate override
    const hasRateOverride = ratePolicy.rateDatePrices?.some(
      (rdp) =>
        rdp.date.split('T')[0] === dateStr &&
        rdp.roomId === room.id &&
        rdp.isActive
    );

    breakdown.push({
      date: dateStr,
      price: nightPrice,
      isOverride: hasRateOverride,
    });

    totalPrice += nightPrice;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    breakdown,
    totalPrice: Math.round(totalPrice * 100) / 100,
    averagePrice: Math.round((totalPrice / nights) * 100) / 100,
  };
}

/**
 * Calculate the display price for a rate option
 * This is used to show the average nightly rate in the UI
 */
export function getRateOptionDisplayPrice(
  room: Room,
  roomRate: RoomRate
): number {
  const ratePolicy = roomRate.ratePolicy;
  const basePrice = ratePolicy.basePrice || 0;
  
  if (basePrice > 0) {
    const percentageAdjustment = roomRate.percentageAdjustment || 0;
    const adjustment = (basePrice * percentageAdjustment) / 100;
    return Math.round((basePrice + adjustment) * 100) / 100;
  }
  
  // Fallback to room price if no base price
  return room.price || 0;
}