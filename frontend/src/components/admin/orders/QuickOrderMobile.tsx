import { useState, useMemo, useEffect } from 'react';
import { BsPlus, BsDash, BsX, BsSearch, BsCart3, BsPerson } from 'react-icons/bs';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';
import { useOrderCategories } from "../../../hooks/useOrderCategories";
import type { OrderItem as OrderItemType, AvailabilityRule } from "../../../types/types";
import type { Customer } from '../../../hooks/useCustomers';

// Helper to check time-based rules
const isWithinTime = (rule: AvailabilityRule | null | undefined): boolean => {
  if (!rule || !rule.isActive) return true;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const isDayMatch = rule.daysOfWeek.includes(dayOfWeek);
  if (!isDayMatch) return false;
  const isTimeMatch = currentTime >= rule.startTime && currentTime <= rule.endTime;
  return isTimeMatch;
};

interface CartItem extends OrderItemType {
  quantity: number;
  locationNames?: string[];
}

export default function QuickOrderMobile({ onClose }: { onClose: () => void }) {
  const { categories: allCategories } = useOrderCategories();
  
  // State management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [temporaryGuestName, setTemporaryGuestName] = useState('Guest');
  const [paymentMethod, setPaymentMethod] = useState<'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER'>('PAY_AT_WAITER');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerType, setCustomerType] = useState<'existing' | 'guest'>('guest');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cartSheetHeight, setCartSheetHeight] = useState('120px');
  const [showBookingSelection, setShowBookingSelection] = useState(false);

  // Fetch customers when needed
  useEffect(() => {
    if (showCustomerModal && customerType === 'existing') {
      fetch(`${baseUrl}/admin/customers/all`, {
        method: "GET",
        credentials: "include"
      })
        .then(res => res.json())
        .then(data => setCustomers(data.data || []))
        .catch(console.error);
    }
  }, [showCustomerModal, customerType]);

  // Filter available categories
  const availableCategories = useMemo(() => {
    return allCategories.filter(c => 
      (c.isAvailable ?? false) && isWithinTime(c.availabilityRule)
    );
  }, [allCategories]);

  // Get products for selected category or all if none selected
  const productsToShow = useMemo(() => {
    const categoriesToProcess = selectedCategory 
      ? availableCategories.filter(c => c.id === selectedCategory)
      : availableCategories;

    const products: { item: OrderItemType; category: any }[] = [];
    const seenProducts = new Set<string>();

    categoriesToProcess.forEach(category => {
      category.orderItems.forEach(item => {
        if (!seenProducts.has(item.id) && item.isAvailable) {
          seenProducts.add(item.id);
          products.push({ item, category });
        }
      });
    });

    // Apply search filter
    if (searchTerm) {
      return products.filter(({ item }) => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return products;
  }, [availableCategories, selectedCategory, searchTerm]);

  // Filter customers - only show when searching
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm || customerSearchTerm.trim().length < 2) return [];
    return customers.filter(c => {
      const fullName = `${c.guestFirstName || ''} ${c.guestLastName || ''}`.toLowerCase();
      const email = (c.guestEmail || '').toLowerCase();
      const search = customerSearchTerm.toLowerCase();
      return fullName.includes(search) || email.includes(search);
    }).slice(0, 10);
  }, [customers, customerSearchTerm]);

  const getCartItemQuantity = (itemId: string) => {
    return cart.find(i => i.id === itemId)?.quantity || 0;
  };

  const updateCartQuantity = (item: OrderItemType, change: 1 | -1, category: any) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);
      const newCart = [...prevCart];

      if (existingItemIndex > -1) {
        const existingItem = newCart[existingItemIndex];
        const newQuantity = existingItem.quantity + change;

        if (newQuantity <= 0) {
          newCart.splice(existingItemIndex, 1);
        } else {
          newCart[existingItemIndex] = { ...existingItem, quantity: newQuantity };
        }
      } else if (change === 1) {
        const locationNames = category.locations?.map((l: any) => l.name) || ['Default'];
        newCart.push({
          ...item,
          quantity: 1,
          locationNames
        });
        // Auto show cart when item added
        if (!showCart) {
          setShowCart(true);
          setCartSheetHeight('50vh');
        }
      }

      return newCart;
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsPlacingOrder(true);

    const allLocationNames = cart.flatMap(item => item.locationNames || []);
    const uniqueLocationNames = [...new Set(allLocationNames)];
    
    if (uniqueLocationNames.length === 0) {
      uniqueLocationNames.push('Default');
    }

    const orderData = {
      items: cart,
      paymentMethod,
      customerId: selectedCustomer?.id,
      temporaryCustomerSurname: selectedCustomer ? undefined : temporaryGuestName,
      locationNames: uniqueLocationNames,
      paymentIntentId: selectedPaymentIntent?.id,
    };

    try {
      const response = await fetch(`${baseUrl}/admin/orders/create`, {
        method: 'POST',
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order');
      }
      
      toast.success('Order placed successfully!');
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Quick Order</h2>
        <button onClick={onClose} className="p-2">
          <BsX className="text-xl" />
        </button>
      </div>

      {/* Search Bar - Fixed */}
      <div className="bg-white px-4 py-2 border-b">
        <div className="relative">
          <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-gray-100 rounded-full text-sm"
          />
        </div>
      </div>

      {/* Category Tabs - Horizontal Scroll */}
      <div className="bg-white px-4 py-2 border-b">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium ${
              !selectedCategory 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          {availableCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium ${
                selectedCategory === category.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="grid grid-cols-2 gap-3 p-4">
          {productsToShow.map(({ item, category }) => {
            const quantity = getCartItemQuantity(item.id);
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-3">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                )}
                <h4 className="font-medium text-sm mb-1 line-clamp-2">{item.name}</h4>
                <p className="text-lg font-bold text-blue-600 mb-2">€{item.price}</p>
                
                {quantity > 0 ? (
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg px-2 py-1">
                    <button
                      onClick={() => updateCartQuantity(item, -1, category)}
                      className="p-1 active:scale-95"
                    >
                      <BsDash className="text-blue-600" />
                    </button>
                    <span className="font-bold text-blue-600">{quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item, 1, category)}
                      className="p-1 active:scale-95"
                    >
                      <BsPlus className="text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => updateCartQuantity(item, 1, category)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm active:scale-95"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Cart Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-all duration-300 ${
          showCart ? '' : 'translate-y-full'
        }`}
        style={{ height: cartSheetHeight }}
      >
        {/* Cart Handle */}
        <button
          onClick={() => {
            if (cartSheetHeight === '120px') {
              setCartSheetHeight('50vh');
            } else if (cartSheetHeight === '50vh') {
              setCartSheetHeight('80vh');
            } else {
              setCartSheetHeight('120px');
            }
          }}
          className="w-full py-2 flex justify-center"
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </button>

        {/* Cart Summary */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BsCart3 className="text-blue-600" />
              <span className="font-semibold">{itemCount} items</span>
            </div>
            <span className="text-xl font-bold">€{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Cart Items - Scrollable */}
        {cartSheetHeight !== '120px' && (
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">€{item.price} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                  <button
                    onClick={() => {
                      const product = productsToShow.find(p => p.item.id === item.id);
                      if (product) {
                        updateCartQuantity(product.item, -1, product.category);
                      }
                    }}
                    className="p-1 active:scale-95"
                  >
                    <BsDash className="text-sm" />
                  </button>
                  <span className="font-semibold text-sm min-w-[20px] text-center">{item.quantity}</span>
                  <button
                    onClick={() => {
                      const product = productsToShow.find(p => p.item.id === item.id);
                      if (product) {
                        updateCartQuantity(product.item, 1, product.category);
                      }
                    }}
                    className="p-1 active:scale-95"
                  >
                    <BsPlus className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="flex-1 p-2 bg-gray-100 rounded-lg text-xs font-medium flex flex-col items-center justify-center"
            >
              <div className="flex items-center gap-1">
                <BsPerson />
                {selectedCustomer ? selectedCustomer.guestFirstName : temporaryGuestName}
              </div>
              {selectedPaymentIntent && (
                <span className="text-[10px] text-blue-600">
                  {selectedPaymentIntent.bookings?.[0]?.room?.name}
                </span>
              )}
            </button>
            <button
              onClick={() => setPaymentMethod(paymentMethod === 'PAY_AT_WAITER' ? 'ASSIGN_TO_ROOM' : 'PAY_AT_WAITER')}
              disabled={!selectedCustomer && paymentMethod === 'ASSIGN_TO_ROOM'}
              className="flex-1 p-2 bg-gray-100 rounded-lg text-xs font-medium"
            >
              {paymentMethod === 'PAY_AT_WAITER' ? 'Waiter' : 'Room'}
            </button>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder || cart.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold active:scale-95 disabled:opacity-50"
          >
            Place Order • €{total.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Floating Cart Button */}
      {!showCart && itemCount > 0 && (
        <button
          onClick={() => {
            setShowCart(true);
            setCartSheetHeight('120px');
          }}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center gap-2"
        >
          <BsCart3 className="text-xl" />
          <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-sm font-bold">
            {itemCount}
          </span>
        </button>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[70vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Select Customer</h3>
              <button onClick={() => setShowCustomerModal(false)}>
                <BsX className="text-xl" />
              </button>
            </div>

            <div className="flex p-2 gap-2 bg-gray-50">
              <button
                onClick={() => setCustomerType('guest')}
                className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                  customerType === 'guest' ? 'bg-white shadow-sm' : ''
                }`}
              >
                Guest
              </button>
              <button
                onClick={() => setCustomerType('existing')}
                className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                  customerType === 'existing' ? 'bg-white shadow-sm' : ''
                }`}
              >
                Existing
              </button>
            </div>

            {customerType === 'guest' ? (
              <div className="p-4">
                <input
                  type="text"
                  placeholder="Enter guest name..."
                  value={temporaryGuestName}
                  onChange={(e) => setTemporaryGuestName(e.target.value)}
                  className="w-full px-3 py-3 border rounded-lg text-sm"
                />
                <button
                  onClick={() => {
                    if (temporaryGuestName.trim()) {
                      setSelectedCustomer(null);
                      setPaymentMethod('PAY_AT_WAITER');
                      setShowCustomerModal(false);
                    }
                  }}
                  className="w-full mt-3 bg-blue-600 text-white py-3 rounded-lg font-semibold"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
                  />
                </div>
                <div className="px-4">
                  {customerSearchTerm.trim().length < 2 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Start typing to search...</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">No customers found</p>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setTemporaryGuestName('');
                          // Check if customer has active payment intents for room selection
                          if (customer.paymentIntents && customer.paymentIntents.length > 0) {
                            setShowCustomerModal(false);
                            setShowBookingSelection(true);
                          } else {
                            setShowCustomerModal(false);
                          }
                        }}
                        className="w-full text-left p-3 border-b active:bg-gray-50"
                      >
                        <p className="font-medium">{customer.guestFirstName} {customer.guestLastName}</p>
                        <p className="text-xs text-gray-500">{customer.guestEmail}</p>
                        {customer.paymentIntents && customer.paymentIntents.length > 0 && (
                          <p className="text-xs text-green-600 mt-0.5">{customer.paymentIntents.length} booking(s)</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Selection Modal */}
      {showBookingSelection && selectedCustomer && selectedCustomer.paymentIntents && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[60vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-base font-bold">Select Room</h3>
              <button 
                onClick={() => {
                  setShowBookingSelection(false);
                  setSelectedCustomer(null);
                  setSelectedPaymentIntent(null);
                }}
              >
                <BsX className="text-xl" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">
                Select which room to charge the order to:
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {selectedCustomer.paymentIntents.map((pi: any) => (
                <button
                  key={pi.id}
                  onClick={() => {
                    setSelectedPaymentIntent(pi);
                    setShowBookingSelection(false);
                  }}
                  className="w-full p-3 mb-2 border rounded-lg text-left active:bg-blue-50 active:border-blue-300"
                >
                  {pi.bookings?.map((booking: any) => (
                    <div key={booking.id}>
                      <p className="font-semibold text-sm">{booking.room?.name || 'Unknown Room'}</p>
                      <p className="text-xs text-gray-500">
                        Booking: {pi.id.slice(-8).toUpperCase()}
                      </p>
                    </div>
                  ))}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}