import { useState, useMemo, useEffect } from 'react';
import { BsPlus, BsDash, BsX, BsCheckCircleFill, BsSearch, BsCart3, BsPerson, BsPersonPlus } from 'react-icons/bs';
import { FaUser, FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';
import { MdTableRestaurant, MdCategory, MdEdit } from 'react-icons/md';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';
import { useOrderCategories } from "../../../hooks/useOrderCategories";
import type { OrderItem as OrderItemType, AvailabilityRule } from "../../../types/types";
import type { Customer } from '../../../hooks/useCustomers';
import QuickOrderMobile from './QuickOrderMobile';

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

export default function QuickOrderModal({ onClose }: { onClose: () => void }) {
  // All hooks must be called before any conditional returns
  const { categories: allCategories, loading: categoriesLoading } = useOrderCategories();
  
  // State management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [temporaryGuestName, setTemporaryGuestName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER'>('PAY_AT_WAITER');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showBookingSelection, setShowBookingSelection] = useState(false);
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState<any>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerType, setCustomerType] = useState<'existing' | 'guest'>('existing');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch customers when customer modal opens and type is existing
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
        // Add the entire item object with quantity and locationNames
        const locationNames = category.locations?.map((l: any) => l.name) || ['Default'];
        newCart.push({
          ...item,
          quantity: 1,
          locationNames
        });
      }

      return newCart;
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setTemporaryGuestName('');
    // Check if customer has active payment intents
    if (customer.paymentIntents && customer.paymentIntents.length > 0) {
      setShowCustomerModal(false);
      setShowBookingSelection(true);
    } else {
      setShowCustomerModal(false);
    }
  };

  const handleGuestConfirm = () => {
    if (temporaryGuestName.trim()) {
      setSelectedCustomer(null);
      setSelectedPaymentIntent(null);
      // Auto-switch to PAY_AT_WAITER when guest is selected
      setPaymentMethod('PAY_AT_WAITER');
      setShowCustomerModal(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    if (!selectedCustomer && !temporaryGuestName) {
      toast.error('Please select a customer or enter guest name');
      return;
    }

    setIsPlacingOrder(true);

    const allLocationNames = cart.flatMap(item => item.locationNames || []);
    const uniqueLocationNames = [...new Set(allLocationNames)];
    
    // Ensure at least one location name
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

  // Use mobile version for mobile devices
  if (isMobile) {
    return <QuickOrderMobile onClose={onClose} />;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[100vh] md:h-[85vh] relative flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Header */}
          <div className="bg-gradient-to-b from-gray-50 to-white px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Quick Order</h2>
              <div className="flex items-center gap-2">
                {/* Mobile Cart Toggle */}
                <button
                  onClick={() => setShowMobileCart(!showMobileCart)}
                  className="md:hidden relative p-1.5 bg-blue-100 rounded-lg"
                >
                  <BsCart3 className="text-blue-600 text-sm" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <BsX className="text-lg text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Products */}
            <div className={`flex-1 flex flex-col ${showMobileCart ? 'hidden md:flex' : 'flex'}`}>
              {/* Category Pills */}
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-all text-xs font-medium ${
                      !selectedCategory 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    All Items
                  </button>
                  {availableCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-all text-xs font-medium ${
                        selectedCategory === category.id 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                
                {/* Search Bar */}
                <div className="relative mt-2">
                  <BsSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto p-2 md:p-3 bg-gray-50">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {productsToShow.map(({ item, category }) => {
                    const quantity = getCartItemQuantity(item.id);
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg border border-gray-200 p-2 hover:shadow-md transition-all"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-14 md:h-16 object-cover rounded-md mb-1.5"
                          />
                        )}
                        <h4 className="font-medium text-[10px] md:text-xs mb-0.5 line-clamp-2 text-gray-900">{item.name}</h4>
                        <p className="text-sm md:text-base font-bold text-blue-600 mb-1.5">€{item.price.toFixed(2)}</p>
                        
                        <div className="flex items-center justify-center">
                          {quantity > 0 ? (
                            <div className="flex items-center gap-0.5 bg-blue-50 rounded-lg px-1 py-0.5 w-full justify-between">
                              <button
                                onClick={() => updateCartQuantity(item, -1, category)}
                                className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                              >
                                <BsDash className="text-blue-600 text-sm" />
                              </button>
                              <span className="font-semibold text-blue-600 text-xs min-w-[16px] text-center">{quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item, 1, category)}
                                className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                              >
                                <BsPlus className="text-blue-600 text-sm" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateCartQuantity(item, 1, category)}
                              className="w-full bg-blue-600 text-white py-1 rounded-lg hover:bg-blue-700 transition-colors font-medium text-[10px] md:text-xs flex items-center justify-center gap-0.5"
                            >
                              <BsPlus className="text-xs" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Panel - Cart & Customer */}
            <div className={`w-full md:w-80 flex flex-col border-l border-gray-200 bg-white ${showMobileCart ? 'flex' : 'hidden md:flex'}`}>
              {/* Compact Customer Section */}
              <div className="p-3 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 text-gray-900">
                    <BsPerson className="text-blue-600 text-sm" />
                    Customer
                  </h3>
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    {selectedCustomer || temporaryGuestName ? 'Change' : 'Select'}
                  </button>
                </div>
                
                {selectedCustomer ? (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-900">
                      {selectedCustomer.guestFirstName} {selectedCustomer.guestLastName}
                    </p>
                    <p className="text-[10px] text-blue-700">{selectedCustomer.guestEmail}</p>
                    {selectedPaymentIntent && (
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        Room: {selectedPaymentIntent.bookings?.[0]?.room?.name || 'N/A'}
                      </p>
                    )}
                  </div>
                ) : temporaryGuestName ? (
                  <div className="p-2 bg-green-50 rounded-lg">
                    <p className="text-xs font-medium text-green-900">Guest: {temporaryGuestName}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                  >
                    <p className="text-xs text-gray-500">Click to select customer</p>
                  </button>
                )}
              </div>

              {/* Compact Payment Method */}
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-semibold text-sm mb-2 text-gray-900">Payment</h3>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPaymentMethod('PAY_AT_WAITER')}
                    className={`flex-1 p-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      paymentMethod === 'PAY_AT_WAITER'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Assign To Waiter
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('ASSIGN_TO_ROOM')}
                    disabled={!selectedCustomer || temporaryGuestName !== ''}
                    className={`flex-1 p-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      paymentMethod === 'ASSIGN_TO_ROOM'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    Assign To Room
                  </button>
                </div>
              </div>

              {/* Cart Items - Now has more space */}
              <div className="flex-1 overflow-y-auto p-3">
                <h3 className="font-semibold text-sm mb-2 text-gray-900">Order Summary</h3>
                
                {cart.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    <BsCart3 className="text-2xl mx-auto mb-1.5 text-gray-300" />
                    <p className="text-xs">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-gray-900 truncate">{item.name}</p>
                          <p className="text-gray-600 text-[10px]">€{item.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-0.5 bg-white rounded px-0.5">
                          <button
                            onClick={() => {
                              const product = productsToShow.find(p => p.item.id === item.id);
                              if (product) {
                                updateCartQuantity(product.item, -1, product.category);
                              }
                            }}
                            className="p-0.5 hover:bg-gray-100 rounded"
                          >
                            <BsDash className="text-gray-600 text-xs" />
                          </button>
                          <span className="font-semibold min-w-[16px] text-center text-xs">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const product = productsToShow.find(p => p.item.id === item.id);
                              if (product) {
                                updateCartQuantity(product.item, 1, product.category);
                              }
                            }}
                            className="p-0.5 hover:bg-gray-100 rounded"
                          >
                            <BsPlus className="text-gray-600 text-xs" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Total and Actions */}
              <div className="p-3 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 font-medium text-sm">Total:</span>
                  <span className="text-lg font-bold text-gray-900">€{total.toFixed(2)}</span>
                </div>
                
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      if (showMobileCart) {
                        setShowMobileCart(false);
                      } else {
                        onClose();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors text-xs"
                  >
                    {showMobileCart ? 'Back' : 'Cancel'}
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder || cart.length === 0 || (!selectedCustomer && !temporaryGuestName)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors text-xs"
                  >
                    {isPlacingOrder ? 'Placing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Select Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <BsX className="text-lg text-gray-600" />
              </button>
            </div>

            {/* Customer Type Toggle */}
            <div className="flex justify-center mb-3">
              <div className="bg-gray-100 rounded-lg p-0.5 flex w-full max-w-xs">
                <button
                  onClick={() => {
                    setCustomerType('existing');
                    setTemporaryGuestName('');
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                    customerType === 'existing' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600'
                  }`}
                >
                  Existing Customer
                </button>
                <button
                  onClick={() => {
                    setCustomerType('guest');
                    setSelectedCustomer(null);
                    setSelectedPaymentIntent(null);
                    // Auto-switch to PAY_AT_WAITER when switching to guest mode
                    if (paymentMethod === 'ASSIGN_TO_ROOM') {
                      setPaymentMethod('PAY_AT_WAITER');
                    }
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                    customerType === 'guest' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600'
                  }`}
                >
                  New Guest
                </button>
              </div>
            </div>
            
            {customerType === 'existing' ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="relative mb-3">
                  <BsSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
                    autoFocus
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                  {customerSearchTerm.trim().length < 2 ? (
                    <p className="text-center text-gray-400 text-xs py-8">Start typing to search customers...</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="text-center text-gray-500 text-xs py-8">No customers found</p>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex justify-between items-center border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900">
                            {customer.guestFirstName} {customer.guestLastName}
                          </p>
                          <p className="text-xs text-gray-500">{customer.guestEmail}</p>
                          {customer.paymentIntents && customer.paymentIntents.length > 0 && (
                            <p className="text-[10px] text-green-600 mt-0.5">
                              {customer.paymentIntents.length} active booking(s)
                            </p>
                          )}
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <BsCheckCircleFill className="text-blue-600 text-sm flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4">
                <input
                  type="text"
                  placeholder="Enter guest name..."
                  value={temporaryGuestName}
                  onChange={(e) => setTemporaryGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleGuestConfirm}
                  disabled={!temporaryGuestName.trim()}
                  className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                >
                  Confirm Guest
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Selection Modal */}
      {showBookingSelection && selectedCustomer && selectedCustomer.paymentIntents && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <h3 className="text-sm font-bold mb-2 text-gray-900">Select Booking for Room Charge</h3>
            <p className="text-xs text-gray-600 mb-3">
              This customer has multiple active bookings. Select which room to charge:
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedCustomer.paymentIntents.map((pi: any) => (
                <div
                  key={pi.id}
                  onClick={() => {
                    setSelectedPaymentIntent(pi);
                    setShowBookingSelection(false);
                  }}
                  className="p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  {pi.bookings?.map((booking: any) => (
                    <div key={booking.id}>
                      <p className="font-semibold text-xs text-gray-900">{booking.room?.name || 'Unknown Room'}</p>
                      <p className="text-[10px] text-gray-600">
                        Booking ID: {pi.id.slice(-8)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setShowBookingSelection(false);
                setSelectedCustomer(null);
                setSelectedPaymentIntent(null);
              }}
              className="mt-3 w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}