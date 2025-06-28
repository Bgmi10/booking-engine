import { useEffect, useState } from "react";
import { subscribeWebSocket, unsubscribeWebSocket, sendWebSocketMessage } from "../../../utils/websocket";
import toast from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";

// Duplicating interfaces for clarity, can be moved to a shared types file
interface WaiterOrder {
  id: string;
  orderId: string;
  items: any[];
  locationName: string;
  status: string;
  createdAt: string;
  assignedToWaiter?: string;
  customerName?: string;
  total?: number;
}

interface TakenInfo {
  orderId: string;
  takenBy: string;
}

export default function WaiterOrders() {
  const [openOrders, setOpenOrders] = useState<WaiterOrder[]>([]);
  const [recentlyTaken, setRecentlyTaken] = useState<TakenInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'mine'>('open');
  const [myOrders, setMyOrders] = useState<WaiterOrder[]>([]);
  const [selectedMyOrder, setSelectedMyOrder] = useState<WaiterOrder | null>(null);
  const { user } = useAuth();

  // Play notification sound
  const playSound = () => {
    const audio = new Audio("/assets/notification_sound.wav");
    audio.play();
  };

  // Push notification
  const showPushNotification = (order: WaiterOrder) => {
    if (window.Notification && Notification.permission === "granted") {
      new Notification("Order Ready for Pickup", {
        body: `Order #${order.orderId?.slice(-6) || order.id?.slice(-6)} at ${order.locationName}`,
      });
    }
  };

  // Normalize order data from API or WS
  const normalizeOrder = (order: any): WaiterOrder => ({
    id: order.id || order.orderId,
    orderId: order.orderId || order.id,
    items: Array.isArray(order.items)
      ? order.items.filter(Boolean).map((item: any) => ({
          ...item,
          imageUrl: item.imageUrl || item.image || '/assets/placeholder.png',
        }))
      : [],
    locationName: order.locationName || (order.location && order.location.name) || '',
    status: order.status,
    createdAt: order.createdAt,
    assignedToWaiter: order.assignedToWaiter || order.assignedTo,
    customerName: order.customerName || (order.customer ? `${order.customer.guestFirstName || ''} ${order.customer.guestLastName || ''}` : ''),
    total: order.total || 0
  });

  // Fetch initial open orders (ready for pickup)
  const fetchOpenOrders = () => {
    fetch(baseUrl + "/admin/customers/orders/assigned/all", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setOpenOrders(data.data.map(normalizeOrder));
      });
  }

  useEffect(() => {
    fetchOpenOrders();
    // Request notification permission
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handleMessage = (data: any) => {
      // An order is marked as READY by the kitchen
      if (data.type === "order:ready") {
        const newOrder = normalizeOrder(data.data);
        setOpenOrders((prev) => [newOrder, ...prev]);
        toast.success("New order ready for pickup!");
        playSound();
        showPushNotification(newOrder);
      }
      // A waiter (could be anyone) accepted an order
      if (data.type === "order:assigned_waiter") {
        const pickedBy = data.data.assignedTo === user?.id 
          ? user?.name 
          : data.data.assignedToName || "Someone";

        setOpenOrders((prev) => prev.filter((o) => o.id !== data.orderId && o.orderId !== data.orderId));
        
        if (data.data.assignedTo === user?.id) {
          const newMyOrder = normalizeOrder({ ...data.data, id: data.orderId });
          setMyOrders((prev) => [newMyOrder, ...prev]);
        }

        setRecentlyTaken({
          orderId: data.orderId,
          takenBy: pickedBy,
        });
        toast(`Order #${data.orderId.slice(-6)} picked up by ${pickedBy}`);
        setTimeout(() => setRecentlyTaken(null), 5000);
      }
      // Successfully marked an order as delivered
      if (data.type === "mark_order_delivered_success") {
        toast.success(`Order #${data.orderId.slice(-6)} marked as delivered!`);
        fetchMyOrders(); // Refresh my orders list
        setSelectedMyOrder(null);
      }
      // A waiter (could be anyone) delivered an order
      if (data.type === 'order:delivered') {
          // If the delivered order is in the current user's list, remove it.
          setMyOrders(prev => prev.filter(o => o.id !== data.orderId));
      }
    };
    subscribeWebSocket(handleMessage);
    return () => unsubscribeWebSocket(handleMessage);
  }, [user]);

  const acceptOrder = (orderId: string) => {
    sendWebSocketMessage({ type: "accept_waiter_order", orderId });
  };

  const fetchMyOrders = () => {
    fetch(baseUrl + "/admin/waiter/orders", { credentials: "include" })
      .then(res => res.json())
      .then(data => setMyOrders((data.data || []).map(normalizeOrder)));
  }

  // Fetch my orders only when 'My Orders' tab is active
  useEffect(() => {
    if (activeTab === 'mine') {
      fetchMyOrders();
    } else {
      fetchOpenOrders();
    }
  }, [activeTab]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-semibold ${activeTab === 'open' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('open')}
        >
          Open Orders
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
          <h2 className="text-2xl font-bold mb-4">Ready for Pickup</h2>
          {recentlyTaken && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-800 font-semibold animate-fade-in">
              Order #{recentlyTaken.orderId.slice(-6)} was picked up by {recentlyTaken.takenBy}
            </div>
          )}
          {openOrders.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No orders ready for pickup</div>
          ) : (
            <div className="space-y-4">
              {openOrders.slice().map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between transition-all animate-fade-in"
                >
                  <div>
                    <div className="font-semibold text-lg">Order #{order.orderId.slice(-6)}</div>
                    <div className="text-gray-600 text-sm mb-2">Location: {order.locationName}</div>
                    <div className="text-gray-700 text-sm mb-2">Items: {order.items?.length || 0}</div>
                    <div className="text-xs text-gray-400">Ready At: {new Date(order.createdAt).toLocaleTimeString()}</div>
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
          <h2 className="text-2xl font-bold mb-4">My Picked Orders</h2>
          {myOrders.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No orders assigned to you</div>
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
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ml-2 ${
                        order.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm mb-2">Location: {order.locationName}</div>
                    <div className="text-gray-700 text-sm mb-2">Items: {order.items?.length || 0}</div>
                    <div className="text-xs text-gray-400">Picked At: {new Date(order.createdAt).toLocaleTimeString()}</div>
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
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  Order #{selectedMyOrder.orderId.slice(-6)}
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ml-2 ${
                    selectedMyOrder.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                    selectedMyOrder.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedMyOrder.status}
                  </span>
                </h3>
                <div className="text-gray-600 mb-2">Location: {selectedMyOrder.locationName}</div>
                <div className="text-gray-700 mb-2">Customer: {selectedMyOrder.customerName || 'N/A'}</div>
                <div className="mb-4">
                  <div className="font-semibold mb-1">Items:</div>
                  <ul className="space-y-2">
                    {selectedMyOrder.items?.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
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
                <div className="mb-2 text-gray-600">Total: <span className="font-semibold">€{selectedMyOrder.total?.toFixed(2)}</span></div>
                {selectedMyOrder.status !== 'DELIVERED' && (
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold mt-4"
                    onClick={() => {
                      sendWebSocketMessage({ type: "mark_order_delivered", orderId: selectedMyOrder.id });
                      setSelectedMyOrder(null);
                    }}
                  >
                    Mark as Delivered
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