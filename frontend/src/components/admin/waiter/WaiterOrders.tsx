import { useEffect, useState } from "react";
import { subscribeWebSocket, unsubscribeWebSocket, sendWebSocketMessage } from "../../../utils/websocket";
import toast from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import EditOrderModal from "./EditOrderModal";
import type { WaiterOrder } from "../../../types/types";

interface TakenInfo {
  orderId: string;
  takenBy: string;
}

export default function WaiterOrders() {
  const [openOrders, setOpenOrders] = useState<WaiterOrder[]>([]);
  //@ts-ignore
  const [recentlyTaken, setRecentlyTaken] = useState<TakenInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'mine'>('open');
  const [myOrders, setMyOrders] = useState<WaiterOrder[]>([]);
  const [selectedMyOrder, setSelectedMyOrder] = useState<WaiterOrder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth(); 

  const playSound = () => {
    const audio = new Audio("/assets/notification_sound.wav");
    audio.play();
  };

  // Push notification
  const showPushNotification = (order: WaiterOrder) => {
    if (window.Notification && Notification.permission === "granted") {
      const notification = new Notification("Order Ready for Pickup", {
        body: `Order #${order.orderId?.slice(-6) || order.id?.slice(-6)} at ${order.locationName}`,
      });

      notification.onclick = () => {
        const targetUrl = `${window.location.origin}/admin/dashboard?sidebar=waiter-orders`;
        window.open(targetUrl, "_self");
      };
    }
  };

  // Normalize order data from API or WS
  const normalizeOrder = (order: any): WaiterOrder => {
    // Determine the source of truth for items. Prioritize `deliveryItems`.
    const itemsToDisplay = order.deliveryItems && order.deliveryItems.length > 0 
      ? order.deliveryItems 
      : order.items;

    const allItems = Array.isArray(order.items) ? order.items : [];
    
    // The presence of items in `deliveryItems` is what matters.
    const hasWaiterItems = itemsToDisplay && itemsToDisplay.length > 0;
    
    // Check for kitchen items based on the original `items` list.
    const hasKitchenItems = allItems.some((item: any) => !item.role || item.role === 'KITCHEN');

    // Determine payment method based on charge object existence
    const paymentMethod = order.charge || (order.data && order.data.charge) 
      ? 'ASSIGN_TO_ROOM' 
      : 'PAY_AT_WAITER';

    return {
      id: order.id || order.orderId,
      orderId: order.orderId || order.id,
      items: (itemsToDisplay || []).filter(Boolean).map((item: any) => ({
        ...item,
        quantity: item.quantity || 1,
        imageUrl: item.imageUrl || item.image || '/assets/placeholder.png',
      })),
      locationName: order.locationName || (order.location && order.location.name) || '',
      status: order.status,
      createdAt: order.createdAt,
      waiterAssignedAt: order.waiterAssignedAt || order.pickedAt,
      assignedToWaiter: order.assignedToWaiter || order.assignedTo,
      assignedToWaiterName: order.assignedToWaiterName || order.assignedToName,
      customerName: order.customerName || (order.customer ? `${order.customer.guestFirstName || ''} ${order.customer.guestLastName || ''}`.trim() : (order.temporaryCustomer ? `Guest ${order.temporaryCustomer.surname || ''}`.trim() : 'Unknown Guest')),
      total: order.total || 0,
      hasKitchenItems: hasKitchenItems,
      hasWaiterItems: hasWaiterItems,
      paymentMethod: paymentMethod
    };
  };

  useEffect(() => {
    const handleMessage = (data: any) => {
      // New order created with waiter items
      if (data.type === "order:created") {
        // This is a heads-up for a hybrid order. Add it to the open orders list.
        if (data.data.hasWaiterItems && data.data.hasKitchenItems) {
          const newOrder = normalizeOrder(data.data);
          setOpenOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
          toast.success("New hybrid order received.");
            playSound();
        }
      }
      // An order is marked as READY by the kitchen
      if (data.type === "order:ready") {
        const newOrder = normalizeOrder(data.data);
        const wasAlreadyAcknowledged = !!data.data.assignedToWaiter;

        // The order should appear in the 'open' list for all waiters,
        // so they can see it's ready. If a waiter had it 'acknowledged',
        // their button will just change from 'Acknowledge' to 'Accept'.
        setOpenOrders(prev => {
          const existingOrderIndex = prev.findIndex(o => o.id === newOrder.id);
          if (existingOrderIndex > -1) {
            const updatedOrders = [...prev];
            updatedOrders[existingOrderIndex] = newOrder;
            return updatedOrders;
          } else {
            return [newOrder, ...prev];
          }
        });
        
        // Also update the order if it's in the current user's "My Orders" list
        setMyOrders(prev => prev.map(o => o.id === newOrder.id ? newOrder : o));

        // Only show a "loud" notification if it's a new ready order that
        // no waiter has seen before.
        if (!wasAlreadyAcknowledged) {
          toast.success("Order ready for pickup!");
        playSound();
        showPushNotification(newOrder);
        }
      }
      // A waiter (could be anyone) accepted an order
      if (data.type === "order:assigned_waiter") {
        const updatedOrder = normalizeOrder({ ...data.data, id: data.orderId });
        
        if (data.data.assignedTo === user?.id) {
          // It's me who acknowledged it. Remove it from my open list.
          setOpenOrders(prev => prev.filter(o => o.id !== updatedOrder.id));

          // Add/update it in my list.
          setMyOrders(prev => [updatedOrder, ...prev.filter(o => o.id !== updatedOrder.id)]);
          toast.success(`You have acknowledged order #${data.orderId.slice(-6)}`);

        } else {
          // Someone else acknowledged it. Update the order in the 'open' list for all other users
          // to show who took it.
          setOpenOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));
          
          // If someone else took it, just show a toast.
          const pickedBy = data.data.assignedToName || "Someone";
          toast(`${pickedBy} acknowledged order #${data.orderId.slice(-6)}`);
        }
      }
      // A waiter (could be anyone) delivered an order
      if (data.type === 'order:delivered' || data.type === 'order:cancelled') {
          // If the delivered/cancelled order is in any list, remove it.
          setMyOrders(prev => prev.filter(o => o.id !== data.orderId));
          setOpenOrders(prev => prev.filter(o => o.id !== data.orderId));
      }
      if (data.type === "order:updated") {
        const updatedOrder = normalizeOrder(data.data);
        
        const updateList = (list: WaiterOrder[]) => list.map(o => o.id === updatedOrder.id ? updatedOrder : o);

        setOpenOrders(updateList);
        setMyOrders(updateList);

        // If the currently selected order is the one that was updated, refresh its state
        if (selectedMyOrder && selectedMyOrder.id === updatedOrder.id) {
          setSelectedMyOrder(updatedOrder);
        }
        toast.success(`Order #${updatedOrder.orderId.slice(-6)} has been updated.`);
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
      fetchAllOpenOrders();
    }
  }, [activeTab]);

  const fetchAllOpenOrders = () => {
    // Fetch both ready orders and pending hybrid orders, then combine them.
    Promise.all([
      fetch(baseUrl + "/admin/customers/orders/assigned/all", { credentials: "include" }).then(res => res.json()),
      fetch(baseUrl + "/admin/waiter/orders/pending-hybrid", { credentials: "include" }).then(res => res.json())
    ]).then(([readyRes, pendingRes]) => {
      const readyOrders = (readyRes.data || []).map(normalizeOrder);
      const pendingOrders = (pendingRes.data || []).map(normalizeOrder);

      // Combine and remove duplicates, prioritizing the ready status if an order is in both
      const combinedOrders = [...readyOrders];
      pendingOrders.forEach((pOrder: WaiterOrder) => {
        if (!combinedOrders.some(rOrder => rOrder.id === pOrder.id)) {
          combinedOrders.push(pOrder);
        }
      });

      setOpenOrders(combinedOrders);
    }).catch(error => console.error("Failed to fetch open orders:", error));
  }

  const handleOrderUpdated = (updatedItems: any[]) => {
    if (!selectedMyOrder) return;

    const newTotal = updatedItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    const updatedOrder = {
      ...selectedMyOrder,
      items: updatedItems,
      deliveryItems: updatedItems,
      total: newTotal,
    };
    
    setMyOrders(prevOrders => prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    
    setSelectedMyOrder(updatedOrder);

    setIsEditModalOpen(false);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/admin/orders/${orderId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel order');
      }

      toast.success('Order cancelled successfully.');
      setSelectedMyOrder(null); 
      // The websocket event `order:cancelled` will remove it from the list.
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

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
            <div className="text-gray-500 text-center py-12">No orders to show</div>
          ) : (
            <div className="space-y-4">
              {openOrders.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row md:items-center justify-between transition-all animate-fade-in ${order.status !== 'READY' ? 'opacity-70' : ''}`}
                >
                  <div>
                    <div className="font-semibold text-lg flex items-center flex-wrap gap-1">
                      Order #{order.orderId.slice(-6)}

                      {/* Badge for hybrid orders waiting on kitchen */}
                      {order.status !== 'READY' && order.hasKitchenItems && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          In Kitchen
                        </span>
                      )}

                      {order.hasKitchenItems && order.status === 'READY' && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          + Kitchen Items
                        </span>
                      )}
                      {!order.hasWaiterItems && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                          No Waiter Items
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600 text-sm mb-2">Location: {order.locationName}</div>
                    <div className="text-gray-700 text-sm mb-2">
                      {order.hasWaiterItems ? (
                        `Items: ${order.items?.length || 0}`
                      ) : (
                        <span className="italic text-amber-700">Ready for pickup (no waiter items)</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${
                        order.paymentMethod === 'ASSIGN_TO_ROOM' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.paymentMethod === 'ASSIGN_TO_ROOM' ? 'Room Charge' : 'Pay at Waiter'}
                      </span>
                      <div className="text-xs text-gray-400">Ready At: {new Date(order.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      className={`${
                        order.assignedToWaiter && order.assignedToWaiter !== user?.id
                          ? 'bg-gray-400 cursor-not-allowed'
                          : order.status === 'READY'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white px-4 py-2 rounded-md font-semibold`}
                      onClick={() => acceptOrder(order.id)}
                      // Disable if someone else has already been assigned to the waiter part
                      disabled={!!order.assignedToWaiter && order.assignedToWaiter !== user?.id}
                    >
                      {order.assignedToWaiter && order.assignedToWaiter !== user?.id
                        ? `Taken by ${order.assignedToWaiterName || '...'}`
                        : order.status === 'READY'
                        ? 'Accept'
                        : 'Acknowledge'}
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
                    <div className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                      Order #{order.orderId.slice(-6)}
                      {order.hasKitchenItems && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          + Kitchen Items
                        </span>
                      )}
                      {!order.hasWaiterItems && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                          No Waiter Items
                        </span>
                      )}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        order.paymentMethod === 'ASSIGN_TO_ROOM' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.paymentMethod === 'ASSIGN_TO_ROOM' ? 'Room Charge' : 'Pay at Waiter'}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm mb-2">Location: {order.locationName}</div>
                    <div className="text-gray-700 text-sm mb-2">
                      {order.hasWaiterItems ? (
                        `Items: ${order.items?.length || 0}`
                      ) : (
                        <span className="italic text-amber-700">No waiter items in this order</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">Picked At: {order.waiterAssignedAt ? new Date(order.waiterAssignedAt).toLocaleTimeString() : 'N/A'}</div>
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative animate-fade-in flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 relative">
                  <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                    onClick={() => setSelectedMyOrder(null)}
                    aria-label="Close"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2 flex-wrap pr-8">
                    Order #{selectedMyOrder.orderId.slice(-6)}
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      selectedMyOrder.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                      selectedMyOrder.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedMyOrder.status}
                    </span>
                  </h3>
                  <div className="text-gray-600 mb-2">Location: {selectedMyOrder.locationName}</div>
                  <div className="text-gray-700">Customer: {selectedMyOrder.customerName || 'N/A'}</div>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 flex-grow overflow-y-auto">
                  {/* Payment Method Banner */}
                  <div className={`mb-4 p-3 rounded-lg ${
                    selectedMyOrder.paymentMethod === 'ASSIGN_TO_ROOM' 
                      ? 'bg-purple-50 border border-purple-100' 
                      : 'bg-green-50 border border-green-100'
                  }`}>
                    <div className="font-semibold text-lg mb-1">
                      {selectedMyOrder.paymentMethod === 'ASSIGN_TO_ROOM' 
                        ? 'Payment: Room Charge' 
                        : 'Payment: Collect from Customer'}
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedMyOrder.paymentMethod === 'ASSIGN_TO_ROOM' 
                        ? `This order has been charged to the customer's room bill.` 
                        : `Please collect payment of €${selectedMyOrder.total?.toFixed(2)} from the customer when delivering this order.`}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 text-gray-800">Order Items:</h4>
                    
                    {/* Waiter Items */}
                    <div className="mb-3">
                      <p className="font-medium text-gray-700">Your Items to Deliver</p>
                      {selectedMyOrder.items?.filter(item => item.role === 'WAITER').length > 0 ? (
                        <ul className="space-y-2 mt-1">
                          {selectedMyOrder.items?.filter(item => item.role === 'WAITER').map((item, idx) => (
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
                        <p className="text-sm text-gray-500 italic mt-1">No specific items for you in this order.</p>
                      )}
                    </div>

                    {/* Kitchen Items */}
                    {selectedMyOrder.hasKitchenItems && (
                      <div>
                        <p className="font-medium text-gray-700">Kitchen Items (In Preparation)</p>
                        <ul className="space-y-2 mt-1 opacity-70">
                          {selectedMyOrder.items?.filter(item => item.role !== 'WAITER').map((item, idx) => (
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
                </div>
                
                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <div className="mb-4 text-gray-600 text-lg">Total: <span className="font-bold text-gray-900">€{selectedMyOrder.total?.toFixed(2)}</span></div>
                  <div className="flex gap-4">
                    {selectedMyOrder.status !== 'DELIVERED' && selectedMyOrder.status !== 'CANCELLED' && (
                       <button
                         className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-semibold"
                         onClick={() => setIsEditModalOpen(true)}
                       >
                         Edit Order
                       </button>
                    )}
                    {selectedMyOrder.status !== 'DELIVERED' && selectedMyOrder.status !== 'CANCELLED' && (
                      <button
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold"
                        onClick={() => {
                          sendWebSocketMessage({ type: "mark_order_delivered", orderId: selectedMyOrder.id });
                          setSelectedMyOrder(null);
                        }}
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                   {selectedMyOrder.status !== 'DELIVERED' && selectedMyOrder.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancelOrder(selectedMyOrder.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold mt-2"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {isEditModalOpen && selectedMyOrder && (
            <EditOrderModal 
              order={selectedMyOrder}
              onClose={() => setIsEditModalOpen(false)}
              onOrderUpdated={handleOrderUpdated}
            />
          )}
        </>
      )}
    </div>
  );
}