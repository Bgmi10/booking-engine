export function generateMergedBookingId(
    bookingIds: string[],
    options?: { maxPerIdLength?: number }
  ): string {
    const MIN = 1;
    const MAX = 5;
    const MAX_ID_PART_LENGTH = options?.maxPerIdLength ?? 6;
  
    if (!Array.isArray(bookingIds)) {
      throw new Error("bookingIds must be an array");
    }
  
    if (bookingIds.length < MIN || bookingIds.length > MAX) {
      throw new Error(`bookingIds must have between ${MIN} and ${MAX} items`);
    }
  
    // Normalize each ID: strip non-alphanumerics, trim to fixed length
    const normalizedIds = bookingIds
      .map((id) => id.replace(/[^a-zA-Z0-9]/g, "").substring(0, MAX_ID_PART_LENGTH))
      .sort(); // ensures consistent ordering
  
    return `BK-${normalizedIds.join("")}`;
}

export function getStatusColor(status: string) {
    switch (status) {
      case "SUCCEEDED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "CANCELLED":
      case "FAILED":
        return "bg-red-100 text-red-800"
      case "REFUNDED":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
