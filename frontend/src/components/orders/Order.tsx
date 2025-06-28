import { useEffect, useState } from "react";
import { baseUrl } from "../../utils/constants";
import { useCustomer } from "../../context/CustomerContext";
import { ShoppingBasket } from "lucide-react";
import { getTokenFromCookie, initCustomerWebSocket, subscribeWebSocket, unsubscribeWebSocket, sendWebSocketMessage } from "../../utils/websocket";
import type { OrderItem } from "../../types/types";

interface CartItem extends OrderItem {
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';
  createdAt: string;
  sessionId: string;
}

interface CustomerVerification {
  isVerified: boolean;
  email: string;
}

export default function Order() {
  const location = new URLSearchParams(window.location.search).get("location");
  const verificationToken = new URLSearchParams(window.location.search).get("token");
  
  // Email validation regex
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // States
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  //@ts-ignore
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderTracking, setOrderTracking] = useState<Order | null>(null);
  const [customerVerification, setCustomerVerification] = useState<CustomerVerification>({ isVerified: false, email: "" });
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [verificationError, setVerificationError] = useState<string>("");
  const customerToken = getTokenFromCookie('customertoken');
  const { customer, isAuthenticated: customerAuth, logout: customerLogout } = useCustomer();

  const isUserVerified = customerAuth || customerVerification.isVerified;

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Handle verification token if present
  useEffect(() => {
    if (verificationToken) {
      verifyCustomerEmail(verificationToken);
    }
  }, [verificationToken]);

  // Verify customer email
  const verifyCustomerEmail = async (token: string) => {
    try {
      const response = await fetch(`${baseUrl}/customers/verify?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setCustomerVerification({ isVerified: true, email: data.data?.email || "" });
        // If we have items in cart, proceed with order
        if (cart.length > 0) {
          submitOrder();
        }
      } else {
        setVerificationError(data.message || "Verification failed. Please try again.");
      }
    } catch (e) {
      console.error("Failed to verify email:", e);
      setVerificationError("Network error. Please try again.");
    }
  };

  // Handle email change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationEmail(e.target.value);
    // Clear error when user starts typing
    if (verificationError) {
      setVerificationError("");
    }
  };

  // Validate email
  const validateEmail = (email: string): boolean => {
    if (!email) {
      setVerificationError("Please enter your email address.");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setVerificationError("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  // Request verification email
  const requestVerificationEmail = async () => {
    // Validate email format first
    if (!validateEmail(verificationEmail)) {
      return;
    }

    try {
      setVerificationStatus("sending");
      setVerificationError("");
      
      // Store current URL for redirect after verification
      if (typeof window !== 'undefined') {
        if (localStorage.getItem('redirectAfterVerify')) {
          localStorage.removeItem('redirectAfterVerify');
        }
        localStorage.setItem('redirectAfterVerify', window.location.href);
      }

      const response = await fetch(`${baseUrl}/customers/request-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: verificationEmail.trim().toLowerCase() }), // Normalize email
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus("sent");
        setVerificationError("");
      } else {
        setVerificationStatus("error");
        if (data.message.includes("not found")) {
          setVerificationError("This email doesn't match our records. Please use the email you provided during booking.");
        } else {
          setVerificationError(data.message || "Failed to send verification email.");
        }
      }
    } catch (e) {
      console.error("Failed to request verification:", e);
      setVerificationStatus("error");
      setVerificationError("Network error. Please try again.");
    }
  };

  // Reset verification state
  const resetVerification = () => {
    setVerificationStatus("idle");
    setVerificationError("");
    setShowVerificationModal(false);
  };

  const fetchOrderItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/customers/order-items?location=${location}`, {
        method: "GET",
        credentials: "include", // Include cookies for authentication
      });
      const data = await response.json();
      if (response.ok) {
        setOrderItems(data.data.orderItem || []);
      }
    } catch (e) {
      console.error("Failed to fetch order items:", e);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = (item: OrderItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  // Update item quantity
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

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Place order via WebSocket
  const submitOrderViaWebSocket = () => {
    if (!isUserVerified) {
      setShowVerificationModal(true);
      return;
    }
    const orderData = {
      items: cart.map(item => ({
        image: item.imageUrl,
        description: item.description,
        name: item.name,
        orderItemId: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      total: cartTotal,
      location: location,
      customerId: customer?.id
    };
    sendWebSocketMessage({
      type: "create_order",
      order: orderData
    });
  };

  // Listen for WebSocket order_created event
  useEffect(() => {
    const handleMessage = (data: any) => {
      if (data.type === "order_created") {
        setCurrentOrder(data.data);
        setCart([]);
        localStorage.removeItem('cart');
        setShowCheckout(false);
        startOrderTracking(data.data.id);
      }
      if (data.type === "error" && data.message?.includes("Order creation")) {
        alert("Order creation failed: " + data.message);
      }
    };
    subscribeWebSocket(handleMessage);
    return () => unsubscribeWebSocket(handleMessage);
  }, []);

  // Submit order (WebSocket only)
  const submitOrder = async () => {
    if (cart.length === 0) return;
    if (!isUserVerified) {
      setShowVerificationModal(true);
      return;
    }
    submitOrderViaWebSocket();
  };

  // Track order status
  const startOrderTracking = (orderId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${baseUrl}/customers/orders/${orderId}`);
        const data = await response.json();
        
        if (response.ok) {
          setOrderTracking(data.data);
          
          // Stop polling if order is completed
          if (data.data.status === 'completed') {
            clearInterval(pollInterval);
          }
        }
      } catch (e) {
        console.error("Failed to track order:", e);
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup after 30 minutes
    setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
  };

  // Load order items on component mount
  useEffect(() => {
    if (location) {
      fetchOrderItems();
    }
  }, [location]);

  // Verification Modal
  const VerificationModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">One Last Step!</h2>
        {verificationStatus === "sent" ? (
          <div className="text-center py-4">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Email Sent!</h3>
            <p className="text-gray-600">
              Please check your email and click the verification link to complete your order.
              The link will expire in 15 minutes.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              To place your order, please enter the email address you used for your booking.
              This helps us keep track of your orders and provide better service.
            </p>
            <div className="relative mb-8">
              <input
                type="email"
                placeholder="Enter your booking email"
                value={verificationEmail}
                onChange={handleEmailChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !verificationError && EMAIL_REGEX.test(verificationEmail)) {
                    requestVerificationEmail();
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 
                  ${verificationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500'}`}
                autoFocus
              />
              {verificationError && (
                <p className=" left-0 text-red-500 text-sm">
                  {verificationError}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={resetVerification}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={requestVerificationEmail}
                disabled={verificationStatus === "sending" || !EMAIL_REGEX.test(verificationEmail)}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                  ${(verificationStatus === "sending" || !EMAIL_REGEX.test(verificationEmail)) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {verificationStatus === "sending" ? "Sending..." :
                 verificationStatus === "error" ? "Try Again" :
                 "Send Verification"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Checkout Modal
  const CheckoutModal = () => (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Checkout</h2>
          
          {/* Cart Items */}
          {cart.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">€{item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>€{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={submitOrder}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Place Order
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!customerAuth || !customerToken) return;

    initCustomerWebSocket(customerToken);

    const handleMessage = (data: any) => {
      // Handle customer events here
      console.log("Customer WS event:", data);
    };

    subscribeWebSocket(handleMessage);
    return () => unsubscribeWebSocket(handleMessage);
  }, [customerAuth, customerToken]);

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Location Specified</h1>
          <p className="text-gray-600">Please scan a QR code to access order items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b z-30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Items</h1>
              <p className="text-gray-600">Location: {location}</p>
            </div>
            <div className="flex items-center space-x-4">
              {customerAuth && customer ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                    <span className="font-medium">{customer.guestFirstName + customer.guestLastName}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transform -translate-y-2 transition-all duration-200 z-50">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm text-gray-600">{customer.guestEmail.slice(0, 20)}....</p>
                    </div>
                    <button
                      onClick={customerLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
              {/* Cart Icon */}
              <button
                onClick={() => setShowCheckout(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900"
              >
                <ShoppingBasket />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-48 bg-gray-200">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-indigo-600">
                      €{item.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showVerificationModal && <VerificationModal />}
      {showCheckout && <CheckoutModal />}

      {/* Order Tracking */}
      {orderTracking && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-40">
          <h3 className="font-semibold text-gray-900 mb-2">Order Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order ID:</span>
              <span className="text-sm font-medium">{orderTracking.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${
                orderTracking.status === 'ready' ? 'text-green-600' :
                orderTracking.status === 'preparing' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {orderTracking.status.charAt(0).toUpperCase() + orderTracking.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-sm font-medium">€{orderTracking.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
