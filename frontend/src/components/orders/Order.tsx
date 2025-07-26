import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { baseUrl } from "../../utils/constants";
import { useCustomer } from "../../context/CustomerContext";
import { ShoppingBasket, ArrowLeft, Clock } from "lucide-react";
import type { OrderItem, OrderCategory } from "../../types/types";
import CustomerVerify from './CustomerVerify';
import OrderSuccess from './OrderSuccess';
import OrderHistory from './OrderHistory';

interface CartItem extends OrderItem {
    quantity: number;
}

export default function Order() {
    const location = new URLSearchParams(window.location.search).get("location");
    const { customer, isAuthenticated, isLoading, refresh, logout } = useCustomer();

    const [categories, setCategories] = useState<OrderCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<OrderCategory | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [showOrderSuccess, setShowOrderSuccess] = useState(false);
    const [showOrderHistory, setShowOrderHistory] = useState(false);
    const [guestType, setGuestType] = useState<'BOOKED_GUEST' | 'PAY_AT_WAITER' | ''>('');
    const [finalPaymentMethod, setFinalPaymentMethod] = useState<'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER' | ''>('');
    
    // Reset states when checkout modal opens
    const openCheckout = () => {
        setGuestType('');
        setFinalPaymentMethod('');
        setShowCheckout(true);
    };
    
    // Reset states when checkout modal closes
    const closeCheckout = () => {
        setShowCheckout(false);
        setGuestType('');
        setFinalPaymentMethod('');
        setShowVerification(false);
    };

    // Close order success modal
    const closeOrderSuccess = () => {
        setShowOrderSuccess(false);
    };

    // Handle order again functionality
    const handleOrderAgain = () => {
        setShowOrderSuccess(false);
        setSelectedCategory(null);
    };
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
      localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const fetchOrderCategories = async () => {
        try {
            const response = await fetch(`${baseUrl}/customers/order-items?location=${location}`);
            const data = await response.json();
            if (response.ok) {
                setCategories(data.data.orderCategories || []);
            }
        } catch (e) {
            console.error("Failed to fetch order categories:", e);
        }
    };

    useEffect(() => {
        if (location) {
            fetchOrderCategories();
        }
    }, [location]);

    const isCategoryAvailable = (category: OrderCategory): boolean => {
        if (category.isAvailable === false) {
            return false;
        }

        const rule = category.availabilityRule;
        if (!rule || !rule.isActive) {
            return true;
        }

        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        if (!rule.daysOfWeek.includes(currentDay)) {
            return false;
        }

        if (currentTime < rule.startTime || currentTime > rule.endTime) {
            return false;
        }

        return true;
    };

    const { availableCategories, unavailableCategories } = useMemo(() => {
        const available: OrderCategory[] = [];
        const unavailable: OrderCategory[] = [];

        categories.forEach(category => {
            if (isCategoryAvailable(category)) {
                available.push(category);
            } else {
                unavailable.push(category);
            }
        });

        return { availableCategories: available, unavailableCategories: unavailable };
    }, [categories]);

    const addToCart = (item: OrderItem) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                );
            } else {
                return [...prevCart, { ...item, quantity: 1 }];
            }
        });
    };
  
    const removeFromCart = (itemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    };
  
    const updateQuantity = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(itemId);
            return;
        }
        setCart(prevCart =>
            prevCart.map(item =>
                item.id === itemId ? { ...item, quantity } : item
            )
        );
    };
  
    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const submitOrder = async () => {
        if (cart.length === 0) return;
        
        // Determine guest type and payment method
        let paymentMethod = finalPaymentMethod;
        let currentGuestType = guestType;
        
        // If authenticated, determine guest type from customer object
        if (isAuthenticated && customer) {
            if ('guestEmail' in customer) {
                // Customer has guestEmail = existing/booked guest
                currentGuestType = 'BOOKED_GUEST';
                paymentMethod = 'ASSIGN_TO_ROOM';
            } else {
                // Customer doesn't have guestEmail = temp guest
                currentGuestType = 'PAY_AT_WAITER';
                paymentMethod = 'PAY_AT_WAITER';
            }
        } else if (!paymentMethod) {
            // Not authenticated, use selected guest type
            if (currentGuestType === 'PAY_AT_WAITER') {
                paymentMethod = 'PAY_AT_WAITER';
            } else if (currentGuestType === 'BOOKED_GUEST') {
                paymentMethod = 'ASSIGN_TO_ROOM';
            } else {
                toast.error("Please select a guest type first.");
                return;
            }
        }
        
        // Update states
        setGuestType(currentGuestType);
        setFinalPaymentMethod(paymentMethod);
        setIsSubmitting(true);
        try {
            // If not authenticated, create temporary customer session (for walk-in guests)
            if (!isAuthenticated) {
                const location = new URLSearchParams(window.location.search).get("location") || "Venue";
                const tempGuestName = `Guest-${Math.random().toString(36).substring(2, 8)}-${location}`;
                
                const loginResponse = await fetch(`${baseUrl}/customers/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        surname: tempGuestName, 
                        isGuest: true 
                    }),
                    credentials: 'include',
                });
                
                if (!loginResponse.ok) {
                    const errorData = await loginResponse.json();
                    throw new Error(errorData.message || 'Failed to create guest session.');
                }
                
                // Refresh customer context after creating session
                await refresh();
            }

            const orderData = {
                items: cart,
                total: cartTotal,
                location: location,
                paymentMethod: paymentMethod,
            };
            const response = await fetch(`${baseUrl}/customers/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to place order.');
            }
            
            // Refresh customer data to get the latest order
            await refresh();
            
            // Show order success modal instead of toast
            setCart([]);
            closeCheckout();
            setShowOrderSuccess(true);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!location) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center p-4">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">No Location Specified</h1>
                    <p className="text-gray-600">Please scan a QR code to access the order menu.</p>
                </div>
            </div>
        );
    }
    
    const CheckoutModal = () => (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {cart.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600 mb-6">Your cart is empty.</p>
                            <button 
                                onClick={closeCheckout} 
                                className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : !isAuthenticated ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Options</h2>
                            <div className="space-y-4 mb-6">
                                {cart.map((item: CartItem) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                                            <div>
                                                <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                                <p className="text-sm text-gray-500">€{item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">-</button>
                                            <span className="w-8 text-center font-medium text-gray-800">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-gray-200 pt-4 mb-6">
                                <div className="flex justify-between text-lg font-bold text-gray-800">
                                    <span>Total:</span>
                                    <span>€{cartTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-gray-800 mb-3">Are you a guest with a reservation?</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input type="radio" name="guestType" value="booked" checked={guestType === 'BOOKED_GUEST'} onChange={(e) => setGuestType('BOOKED_GUEST')} className="h-5 w-5 text-black border-gray-300 focus:ring-black" />
                                        <div className="ml-4">
                                            <span className="text-gray-800 font-medium">Yes, I have a reservation</span>
                                            <p className="text-sm text-gray-500">I'm staying at the hotel and have a room</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input type="radio" name="guestType" value="temp" checked={guestType === 'PAY_AT_WAITER'} onChange={(e) => setGuestType('PAY_AT_WAITER')} className="h-5 w-5 text-black border-gray-300 focus:ring-black" />
                                        <div className="ml-4">
                                            <span className="text-gray-800 font-medium">No, I'm a walk-in guest</span>
                                            <p className="text-sm text-gray-500">I don't have a reservation, pay the waiter</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={closeCheckout} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Back</button>
                                <button 
                                    onClick={() => {
                                        if (!guestType) {
                                            toast.error("Please select an option");
                                            return;
                                        }
                                        if (guestType === 'PAY_AT_WAITER') {
                                            setFinalPaymentMethod('PAY_AT_WAITER');
                                            // For temp guests, submit order directly (skip verification)
                                            submitOrder();
                                        } else if (guestType === 'BOOKED_GUEST') {
                                            setFinalPaymentMethod('ASSIGN_TO_ROOM');
                                            // For booked guests, show verification modal
                                            setShowVerification(true);
                                        }
                                    }} 
                                    disabled={!guestType} 
                                    className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    Place Order
                                </button>
                            </div>
                        </>
                    ) : (
                        (
                            // Final order confirmation
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Confirm Order</h2>
                                <div className="space-y-4 mb-6">
                                    {cart.map((item: CartItem) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-4">
                                                <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                                    <p className="text-sm text-gray-500">€{item.price.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <span className="font-medium text-gray-800">x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200 pt-4 mb-6">
                                    <div className="flex justify-between text-lg font-bold text-gray-800">
                                        <span>Total:</span>
                                        <span>€{cartTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <p className="text-sm text-gray-600">
                                        Payment method: {finalPaymentMethod === 'ASSIGN_TO_ROOM' ? 'Sign to Room' : 'Pay the Waiter'}
                                    </p>
                                    {guestType === 'BOOKED_GUEST' && (
                                        <p className="text-sm text-gray-600">
                                            Guest: {'guestFirstName' in
                                            //@ts-ignore
                                            customer ? `${customer.guestFirstName} ${customer.guestLastName}` : customer.surname}
                                        </p>
                                    )}
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={closeCheckout} className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors">Back</button>
                                    <button onClick={submitOrder} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">{isSubmitting ? 'Placing Order...' : 'Place Order'}</button>
                                </div>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );

    const VerificationModal = () => (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Verification</h2>
                        <button onClick={() => setShowVerification(false)} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <CustomerVerify 
                        onVerificationSuccess={() => {
                            refresh();
                            setShowVerification(false);
                        }} 
                        guestType={guestType === 'BOOKED_GUEST' ? 'booked' : 'temp'}
                    />
                </div>
            </div>
        </div>
    );

    const renderHeader = () => (
        <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b z-30 sticky top-0">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    {selectedCategory ? (
                         <button onClick={() => setSelectedCategory(null)} className="flex items-center space-x-2 text-gray-700 hover:text-black font-medium">
                            <ArrowLeft size={20} />
                            <span>Menu</span>
                        </button>
                    ) : (
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Menu</h1>
                            <p className="text-gray-500">Location: {location}</p>
                        </div>
                    )}
                    <div className="flex items-center space-x-4">
                        {isAuthenticated && customer && customer.orders && customer.orders.length > 0 && (
                            <button 
                                onClick={() => setShowOrderHistory(true)}
                                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <Clock className="w-5 h-5" />
                                <span className="font-medium">Orders</span>
                            </button>
                        )}
                        {isAuthenticated && customer && (
                            <div className="relative group">
                                <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                                    <span className="font-medium">{'guestFirstName' in customer ? `${customer.guestFirstName}` : customer.surname}</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div className="px-4 py-3 border-b">
                                    <p>{typeof customer === 'object' && customer && 'guestEmail' in customer ? (customer as any).guestEmail : 'Temporary Guest'}</p>
                                    </div>
                                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
                                </div>
                            </div>
                        )}
                        <button onClick={openCheckout} className="relative p-2 text-gray-600 hover:text-black">
                            <ShoppingBasket />
                            {cart.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{cart.reduce((total, item) => total + item.quantity, 0)}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCategories = () => (
        <>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Available Menus</h2>
            {availableCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableCategories.map((category) => (
                        <div key={category.id} onClick={() => setSelectedCategory(category)} className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-300 group">
                            <div className="h-48 relative">
                                <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <h3 className="absolute bottom-0 left-0 p-4 text-2xl font-bold text-white">{category.name}</h3>
                            </div>
                            <p className="p-4 text-gray-600 text-sm">{category.description}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No menus are currently available.</p>
            )}

            {unavailableCategories.length > 0 && (
                <>
                    <h2 className="text-3xl font-bold text-gray-800 mt-12 mb-6">Unavailable Menus</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {unavailableCategories.map((category) => (
                             <div key={category.id} className="bg-white rounded-xl shadow-lg overflow-hidden relative cursor-not-allowed">
                                <div className="h-48 relative filter grayscale">
                                    <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50"></div>
                                </div>
                                <div className="p-4">
                                     <h3 className="font-bold text-gray-500">{category.name}</h3>
                                     <p className="text-gray-400 text-sm">{category.description}</p>
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                     <span className="bg-gray-800/70 text-white font-semibold px-4 py-2 rounded-md">UNAVAILABLE</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );

    const renderItemsForCategory = (category: OrderCategory) => {
        const sortedItems = [...category.orderItems].sort((a, b) => {
            const aAvailable = a.isAvailable !== false;
            const bAvailable = b.isAvailable !== false;
            return (bAvailable ? 1 : 0) - (aAvailable ? 1 : 0);
        });

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedItems.map((item: OrderItem) => {
                    const isAvailable = item.isAvailable !== false;
                    const cartItem = cart.find(ci => ci.id === item.id);
                    const quantity = cartItem ? cartItem.quantity : 0;

                    return (
                        <div key={item.id} className={`bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 ${!isAvailable ? 'filter grayscale' : ''}`}>
                             <div className="h-48 bg-gray-200 relative">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                {!isAvailable && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="bg-gray-800/70 text-white font-semibold px-4 py-2 rounded-md">UNAVAILABLE</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className={`text-lg font-bold mb-2 ${isAvailable ? 'text-gray-800' : 'text-gray-500'}`}>{item.name}</h3>
                                <p className={`text-sm mb-4 flex-grow ${isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>{item.description}</p>
                                <div className="flex justify-between items-center mt-auto">
                                    <span className={`text-xl font-bold ${isAvailable ? 'text-black' : 'text-gray-500'}`}>€{item.price.toFixed(2)}</span>
                                    {quantity > 0 ? (
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => updateQuantity(item.id, quantity - 1)} className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">-</button>
                                            <span className="w-8 text-center font-medium text-gray-800">{quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, quantity + 1)} className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">+</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => isAvailable && addToCart(item)}
                                            disabled={!isAvailable}
                                            className={`text-white px-5 py-2 rounded-lg font-semibold transition-colors ${
                                                isAvailable
                                                ? 'bg-black hover:bg-gray-800'
                                                : 'bg-gray-300 cursor-not-allowed'
                                            }`}
                                        >
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {renderHeader()}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {selectedCategory ? renderItemsForCategory(selectedCategory) : renderCategories()}
            </div>
            {showCheckout && <CheckoutModal />}
            {showVerification && <VerificationModal />}
            {showOrderSuccess && (
                <OrderSuccess
                    onOrderAgain={handleOrderAgain}
                    onClose={closeOrderSuccess}
                />
            )}
            {showOrderHistory && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Order History</h2>
                                <button 
                                    onClick={() => setShowOrderHistory(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <OrderHistory onClose={() => setShowOrderHistory(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
