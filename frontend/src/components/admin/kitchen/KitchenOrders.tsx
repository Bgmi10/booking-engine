import { useEffect, useState } from "react";
import { subscribeWebSocket, unsubscribeWebSocket, sendWebSocketMessage } from "../../../utils/websocket";
import toast from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import type { KitchenOrder } from "../../../types/types";

interface TakenInfo {
  orderId: string;
  takenBy: string;
}

export default function KitchenOrders() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [recentlyTaken, setRecentlyTaken] = useState<TakenInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'mine'>('open');
  const [myOrders, setMyOrders] = useState<KitchenOrder[]>([]);
  const [selectedMyOrder, setSelectedMyOrder] = useState<KitchenOrder | null>(null);
  const { user } = useAuth();

  console.log(selectedMyOrder)


  // Play notification sound
  const playSound = () => {
    const audio = new Audio("/assets/notification_sound.wav");
    audio.play();
  };

  // Push notification
  const showPushNotification = (order: any) => {
    console.log(order);
    if (window.Notification && Notification.permission === "granted") {
      const notification = new Notification("New Kitchen Order", {
        body: `Order #${order.orderId?.slice(-6) || order.id?.slice(-6)} at ${order.locationName}`,
      });

      notification.onclick = () => {
        const targetUrl = `${window.location.origin}/admin/dashboard?sidebar=kitchen-orders`;
        window.open(targetUrl, "_self");
      };
    }
  };

  // Normalize order data from API or WS
  const normalizeOrder = (order: any): KitchenOrder => {
    // Get all items first
    const allItems = Array.isArray(order.items) ? order.items : [];
    
    // Filter kitchen items for display
    const kitchenItems = allItems.filter((item: any) => 
      item && (!item.role || item.role === 'KITCHEN')
    );
    const hasKitchenItems = kitchenItems.length > 0;
    
    // Count waiter items to determine if there are any
    const waiterItems = allItems.filter((item: any) => item && item.role === 'WAITER');
    const hasWaiterItems = waiterItems.length > 0;
    
    // Use kitchen items if available, otherwise fall back to allItems or kitchenItems from event data
    const displayItems = kitchenItems.length > 0
      ? kitchenItems
      : Array.isArray(order.kitchenItems) && order.kitchenItems.length > 0
      ? order.kitchenItems
      : [];

    // Determine payment method based on charge object existence
    const paymentMethod = order.charge || (order.data && order.data.charge) 
      ? 'ASSIGN_TO_ROOM' 
      : 'PAY_AT_WAITER';
    
    return {
      id: order.id || order.orderId,
      orderId: order.orderId || order.id,
      items: displayItems.filter(Boolean).map((item: any) => ({
        ...item,
        imageUrl: item.imageUrl || item.image || '/assets/placeholder.png',
      })),
      locationName: order.locationName || (order.location && order.location.name) || '',
      status: order.status,
      createdAt: order.createdAt,
      assignedToKitchen: order.assignedToKitchen || order.assignedTo,
      customerName: order.customerName || (order.customer ? `${order.customer.guestFirstName || ''} ${order.customer.guestLastName || ''}`.trim() : (order.temporaryCustomer ? `Guest ${order.temporaryCustomer.surname || ''}`.trim() : 'Unknown Guest')),
      total: order.total || 0,
      hasWaiterItems: hasWaiterItems,
      hasKitchenItems: hasKitchenItems,
      paymentMethod: paymentMethod
    };
  };

  // Fetch initial orders
  useEffect(() => {
    fetch(baseUrl + "/admin/customers/orders/pending/all", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setOrders(data.data.map(normalizeOrder));
      });
    // Request notification permission
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handleMessage = (data: any) => {
      if (data.type === "queue:kitchen_update") {
        setOrders((data.data.queue || []).map(normalizeOrder));
      }
      if (data.type === "order:created") {
        // This event is now the source of truth for a new order.
        // We add it to the list immediately for a responsive UI.
        if (data.data.hasKitchenItems) {
          const newOrder = normalizeOrder(data.data);
            
            setOrders(prevOrders => {
              // Prevent duplicates if the event is somehow processed more than once.
              if (prevOrders.some(o => o.id === newOrder.id)) {
                return prevOrders;
              }
              return [newOrder, ...prevOrders];
            });

            toast.success("New order received!");
            playSound();
            showPushNotification(newOrder);
        }
      }
      if (data.type === "order:assigned_kitchen") {
        const pickedBy = data.data.assignedTo === user?.id 
          ? user?.name 
          : data.data.assignedToName || "Someone";

        setOrders((prev) => prev.filter((o) => o.id !== data.orderId && o.orderId !== data.orderId));
        
        if (data.data.assignedTo === user?.id) {
          const newMyOrder = normalizeOrder({ ...data.data, id: data.orderId });
          setMyOrders((prev) => [newMyOrder, ...prev]);
        }

        setRecentlyTaken({
          orderId: data.orderId,
          takenBy: pickedBy,
        });
        toast(`Order #${data.orderId.slice(-6)} picked by ${pickedBy}`);
        setTimeout(() => setRecentlyTaken(null), 5000);
      }
      if (data.type === "order:ready") {
        setMyOrders((prev) => prev.filter((o) => o.id !== data.orderId));
        setSelectedMyOrder(null);
      }
      if (data.type === "mark_kitchen_ready_success") {
        toast.success(`Order #${data.orderId.slice(-6)} marked as ready!`);
        fetchMyOrders();
        setSelectedMyOrder(null);
      }
    };
    subscribeWebSocket(handleMessage);
    return () => unsubscribeWebSocket(handleMessage);
  }, [user]);

  const acceptOrder = (orderId: string) => {
    sendWebSocketMessage({ type: "accept_kitchen_order", orderId });
  };

  const fetchMyOrders = () => {
    fetch(baseUrl + "/admin/kitchen/orders", { credentials: "include" })
      .then(res => res.json())
      .then(data => setMyOrders((data.data || []).map(normalizeOrder)));
  }

  // Fetch my orders only when 'My Orders' tab is active
  useEffect(() => {
    if (activeTab === 'mine') {
      fetchMyOrders();
    }
  }, [activeTab]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'open' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('open')}
        >
          Kitchen Orders
        </button>
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'mine' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('mine')}
        >
          My Orders
        </button>
      </div>
      {activeTab === 'open' && (
        <>
          <h2 className="text-2xl font-bold mb-4">Kitchen Orders</h2>
          {recentlyTaken && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-800 font-semibold animate-fade-in">
              Order #{recentlyTaken.orderId.slice(-6)} was picked by {recentlyTaken.takenBy}
            </div>
          )}
          {orders.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No open orders</div>
          ) : (
            <div className="space-y-4">
              {orders.slice().reverse().map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between transition-all animate-fade-in"
                >
                  <div>
                    <div className="font-semibold text-lg flex items-center">
                      Order #{order.orderId.slice(-6)}
                      {order.hasWaiterItems && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          + Waiter Items
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600 text-sm mb-2">Location: {order.locationName}</div>
                    <div className="text-gray-700 text-sm mb-2">
                      Items: {order.items?.length || 0}
                    </div>
                    <div className="text-xs text-gray-400">Created: {new Date(order.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold"
                      onClick={() => acceptOrder(order.id)}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activeTab === 'mine' && (
        <>
          <h2 className="text-2xl font-bold mb-4">My Orders</h2>
          {myOrders.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No orders</div>
          ) : (
            <div className="space-y-4">
              {myOrders.slice().reverse().map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between transition-all animate-fade-in cursor-pointer border-2 ${selectedMyOrder?.id === order.id ? 'border-blue-500' : 'border-transparent'}`}
                  onClick={() => setSelectedMyOrder(order)}
                >
                  <div>
                    <div className="font-semibold text-lg flex items-center gap-2">
                      Order #{order.orderId.slice(-6)}
                      {order.hasWaiterItems && (
                        <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          + Waiter Items
                        </span>
                      )}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ml-2 ${
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'PREPARING' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'READY' ? 'bg-green-100 text-green-800' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm mb-2">Location: {order.locationName}</div>
                    <div className="text-gray-700 text-sm mb-2">
                      Items: {order.items?.length || 0}
                    </div>
                    <div className="text-xs text-gray-400">Created: {new Date(order.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
                      onClick={e => { e.stopPropagation(); setSelectedMyOrder(order); }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedMyOrder && (
            <div 
              className="fixed inset-0 bg-black/50 bg-opacity-40 z-50 flex items-center justify-center p-4"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setSelectedMyOrder(null)}
            >
              <div 
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-3xl font-bold"
                  onClick={() => setSelectedMyOrder(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2 flex-wrap">
                  Order #{selectedMyOrder.orderId.slice(-6)}
                  {selectedMyOrder.hasWaiterItems && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      + Waiter Items
                    </span>
                  )}
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                    selectedMyOrder.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    selectedMyOrder.status === 'PREPARING' ? 'bg-blue-100 text-blue-800' :
                    selectedMyOrder.status === 'READY' ? 'bg-green-100 text-green-800' :
                    selectedMyOrder.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedMyOrder.status}
                  </span>
                </h3>
                <div className="text-gray-600 mb-2">Location: {selectedMyOrder.locationName}</div>
                <div className="text-gray-700 mb-2">Customer: {selectedMyOrder.customerName || 'N/A'}</div>
                
                {/* Payment Method Indicator */}
                <div className={`mb-4 p-3 rounded-lg ${
                  selectedMyOrder.paymentMethod === 'ASSIGN_TO_ROOM' 
                    ? 'bg-purple-50 border border-purple-100' 
                    : 'bg-green-50 border border-green-100'
                }`}>
                  <div className="font-semibold">
                    {selectedMyOrder.paymentMethod === 'ASSIGN_TO_ROOM' 
                      ? 'Payment: Room Charge' 
                      : 'Payment: Pay at Waiter'}
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-gray-800">Order Items:</h4>

                  {/* Kitchen Items */}
                  <div className="mb-3">
                    <p className="font-medium text-gray-700">Your Items to Prepare</p>
                    {selectedMyOrder.items?.filter(item => item.role !== 'WAITER').length > 0 ? (
                      <ul className="space-y-2 mt-1">
                        {selectedMyOrder.items?.filter(item => item.role !== 'WAITER').map((item, idx) => (
                          <li key={idx} className="flex items-center gap-3 p-2 rounded bg-green-50">
                            <img
                              src={item.imageUrl || item.image || '/assets/placeholder.png'}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded border"
                              onError={e => (e.currentTarget.src = '/assets/placeholder.png')}
                            />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                              <div className="text-xs text-gray-500">Qty: {item.quantity || 1}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic mt-1">No specific kitchen items in this order.</p>
                    )}
                  </div>

                  {/* Waiter Items */}
                  {selectedMyOrder.hasWaiterItems && (
                    <div>
                      <p className="font-medium text-gray-700">Waiter Items (For Reference)</p>
                      <ul className="space-y-2 mt-1 opacity-70">
                        {selectedMyOrder.items?.filter(item => item.role === 'WAITER').map((item, idx) => (
                          <li key={idx} className="flex items-center gap-3 p-2 rounded bg-gray-100">
                        <img
                          src={item.imageUrl || item.image || '/assets/placeholder.png'}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded border"
                          onError={e => (e.currentTarget.src = '/assets/placeholder.png')}
                        />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                          <div className="text-xs text-gray-500">Qty: {item.quantity || 1}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                  )}
                </div>

                <div className="mb-2 text-gray-600">Total: <span className="font-semibold">€{selectedMyOrder.total?.toFixed(2)}</span></div>
                {selectedMyOrder.status !== 'READY' && (
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold mt-4"
                    onClick={() => {
                      sendWebSocketMessage({ type: "mark_kitchen_ready", orderId: selectedMyOrder.id });
                      setSelectedMyOrder(null);
                    }}
                  >
                    Mark as Ready
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 