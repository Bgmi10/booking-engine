import { Router } from "express";
import { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, updateBooking, deleteBooking, createEnhancement, deleteEnhancement, updateEnhancement, getAllEnhancements, getAllRatePolicies, createRatePolicy, updateRatePolicy, deleteRatePolicy, bulkPoliciesUpdate, updateBasePrice, updateRoomPrice, updateGeneralSettings, getGeneralSettings, createAdminPaymentLink, getAllPaymentIntent, softDeletePaymentIntent, hardDeletePaymentIntent, restorePaymentIntent, sendConfirmationEmail, getAllBookingsRestriction, createBookingsRestriction, deleteBookingsRestriction, editBookingRestriction, getUserByID, getNotificationAssignableUsers, createBankTransfer, collectCash, getAllBankDetails, createBankDetails, updateBankDetails, deleteBankDetails, confirmBooking, resendBankTransferInstructions, confirmPaymentMethod, processPartialRefund, getBookingRefundInfo, getPaymentIntentBookings, processCustomPartialRefund, getAllSoftDeletedPaymentIntent, updatePaymentIntent, getPaymentIntentAuditLogs, sendInvoice, sendGroupInvoice, sendManualCheckInForBooking, sendManualCheckInForPaymentIntent, sendManualCheckInForBookingGroup } from "../controllers/adminController";
import { createUserSchema, loginSchema } from "../zod/admin.auth.schema";
import validateMiddleware from "../middlewares/validateMiddleware";
import { createRoomSchema, updateRoomImageSchema, updateRoomSchema  } from "../zod/admin.room.schema";
import { deleteTempHold, getAllRooms, getAllTempHolds } from "../controllers/roomController";
import { createEnhancementSchema, updateEnhancementSchema } from "../zod/enhancement.schema";
import authMiddleware from "../middlewares/authMiddlware";
import { createRatePolicySchema, updateRatePolicySchema } from "../zod/ratepolicy.schema";
import { getTemplateById, getTemplates, getTemplateVariables, createTemplate, updateTemplate, deleteTemplate, deleteBulkEmailTemplates } from "../controllers/emailTemplateController";
import { refund, processFutureRefund } from "../controllers/adminController";
import { bookingRestrictionSchema, bookingRestrictionUpdateSchema } from "../zod/booking.schema";
import { createVoucher, createVoucherProduct, deleteVoucher, deleteVoucherProduct, editVoucher, editVoucherProduct, getAllVoucherProducts, getAllVouchers, getVouchers } from "../controllers/voucherController";
import { updateVoucherProductSchema, updateVoucherSchema, voucherProductSchema, voucherSchema } from "../zod/voucher.scheme";
import { createCustomer, deleteCustomer, editCustomer, getAllCustomers, getCustomerBookings, getCustomerChargePayments, getCustomerById, getPaymentMethodsForCustomer, getCustomerRelationshipsAdmin, removeCustomerRelationshipAdmin, updateCustomerAdminNotes } from "../controllers/customerController";
import { customerSchema } from "../zod/customer.schema";
import { updateCustomerSchema } from "../zod/customer.schema";
import { 
    createBookingGroup, 
    updateBookingGroup, 
    addPaymentIntentsToGroup, 
    removePaymentIntentsFromGroup, 
    deleteBookingGroup, 
    getBookingGroup, 
    getAllBookingGroups,
    getBookingGroupAuditLogs,
    getAllDeletionAuditLogs
} from "../controllers/groupController";
import { chargeNewCard, chargeSaveCard, collectCashFromCustomer, createQrSession, getChargeById, getPaymentIntentCharges, refundCharge } from "../controllers/chargeController";
import { createManualTransactionCharge } from "../controllers/chargeController";
import { getNotifications, getNotificationById, createNotification, updateNotification, completeNotification, deleteNotification, getDailyActionList, deleteNotificationAttachment } from '../controllers/notificationController';
import { getAutomatedTaskRules, createAutomatedTaskRule, updateAutomatedTaskRule, deleteAutomatedTaskRule } from '../controllers/automatedTaskRuleController';
import { createLocation, deleteLocation, getAllLocations, updateLocation } from "../controllers/locationController";
import { createOrderItem, deleteOrderItem, getAllOrderItem, updateOrderItem } from "../controllers/orderItemController";
import { createAdminOrder, getAllAssignedCustomersOrders, getAllPendingCustomersOrders, getKitchenOrdersByUserId, getOrderById, getWaiterOrdersByUserId, getPendingHybridOrdersForWaiter } from "../controllers/orderController";
import { createOrderCategory, deleteOrderCategory, getAllOrderCategories, updateOrderCategory } from "../controllers/orderCategoryController";
import { editOrder, cancelOrder } from "../controllers/orderController";
import { getAllTempCustomers, getTempCustomerChargePayments, getTempCustomerOrders } from "../controllers/tempCustomerController";
import { createProduct, deleteProduct, getAllProducts, getProductById, updateProduct } from "../controllers/productController";
import { createProductSchema, updateProductSchema } from "../zod/product.schema";
import { createProposal, getAllProposals, getProposalById, updateProposal, updateProposalStatus, deleteProposal, updateItineraryItems, generateProposalPDF, sendProposalEmail } from '../controllers/proposalController';
import { createProposalSchema, updateProposalSchema, updateProposalStatusSchema } from "../zod/proposal.schema";
import { updateExternalVendor, deleteExternalVendor } from '../controllers/externalVendorController';
import { updateServiceRequest, addServiceRequestMessage, getServiceRequestsForProposal, getServiceRequestById } from '../controllers/serviceRequestController';
import revenueRouter from './revenueRoutes';
import rateDatePriceRoutes from './rateDatePriceRoutes';
import beds24Router from './beds24Routes';
import { 
  getLicensePlateEntries, 
  getLicensePlateEntry, 
  createLicensePlateEntry, 
  updateLicensePlateEntry, 
  deleteLicensePlateEntry,
  exportLicensePlateEntries,
  getLicensePlateStats
} from '../controllers/licensePlateController';
import { 
  createLicensePlateSchema, 
  updateLicensePlateSchema, 
} from '../zod/licensePlate.schema';
import { getBulkOverRideLogs } from "../controllers/bulkOverRideLogsController";
import { createOrderItemScheme, updateOrderItemsScheme } from "../zod/orderItem.scheme";
import { generateCustomerInvoice, generateTaxOptimizedInvoice, generateGroupCustomerInvoice, generateGroupTaxOptimizedInvoice } from '../controllers/invoiceController';
import { 
    createBookingGroupSchema, 
    updateBookingGroupSchema, 
    addPaymentIntentsSchema, 
    removePaymentIntentsSchema 
} from '../zod/bookingGroup.schema';

const adminRouter = Router();

adminRouter.post("/login",  validateMiddleware(loginSchema), login);

adminRouter.put("/users/:id/role", authMiddleware, updateUserRole);

adminRouter.delete("/users/:id", authMiddleware, deleteUser);

adminRouter.post("/users", authMiddleware, validateMiddleware(createUserSchema), createUser);

adminRouter.get("/users/all", authMiddleware, getAllusers);

adminRouter.get("/users/:id", authMiddleware, getUserByID);

adminRouter.get("/notification-users", authMiddleware, getNotificationAssignableUsers);

adminRouter.post("/logout", logout);    

adminRouter.get("/profile", authMiddleware, getAdminProfile);

adminRouter.put("/profile", authMiddleware, updateAdminProfile);

adminRouter.put("/profile/change-password", authMiddleware, updateAdminPassword);

adminRouter.post("/forget-password", forgetPassword);

adminRouter.post("/reset-password", resetPassword);

adminRouter.post("/rooms", authMiddleware, validateMiddleware(createRoomSchema), createRoom);

adminRouter.get("/rooms/all", authMiddleware, getAllRooms);

adminRouter.put("/rooms/:id", authMiddleware, validateMiddleware(updateRoomSchema), updateRoom);

adminRouter.delete("/rooms/:id", authMiddleware, deleteRoom);

adminRouter.put("/rooms/:id/images/:imageId", authMiddleware, validateMiddleware(updateRoomImageSchema), updateRoomImage);

//@ts-ignore
adminRouter.post("/rooms/:id/images", authMiddleware, createRoomImage);

adminRouter.delete("/rooms/:id/images/:imageId", authMiddleware, deleteRoomImage);

adminRouter.get("/bookings/all", authMiddleware, getAllBookings);

adminRouter.put("/bookings/:id", authMiddleware, updateBooking);

adminRouter.delete("/bookings/:id", authMiddleware, deleteBooking);

adminRouter.get("/bookings/:id", authMiddleware, getBookingById);

adminRouter.post("/upload-url", authMiddleware, uploadUrl);

adminRouter.delete("/delete-image", authMiddleware, deleteImage);

adminRouter.get("/enhancements/all", authMiddleware, getAllEnhancements);

adminRouter.post("/enhancements", authMiddleware, validateMiddleware(createEnhancementSchema), createEnhancement);

adminRouter.put("/enhancements/:id", authMiddleware, validateMiddleware(updateEnhancementSchema), updateEnhancement);

adminRouter.delete("/enhancements/:id", authMiddleware, deleteEnhancement);

adminRouter.get("/rate-policies/all", authMiddleware, getAllRatePolicies);

adminRouter.post("/rate-policies", authMiddleware, validateMiddleware(createRatePolicySchema), createRatePolicy);

adminRouter.put("/rate-policies/:id", authMiddleware, validateMiddleware(updateRatePolicySchema), updateRatePolicy);

adminRouter.delete("/rate-policies/:id", authMiddleware, deleteRatePolicy);

adminRouter.post("/rooms/bulk-policies-update", authMiddleware, bulkPoliciesUpdate);

adminRouter.put("/base-price", authMiddleware, updateBasePrice);

adminRouter.put("/rooms/:id/price", authMiddleware, updateRoomPrice);

adminRouter.get('/bulk-override-logs', authMiddleware, getBulkOverRideLogs);

adminRouter.use("/rate-policies", rateDatePriceRoutes);

adminRouter.get("/settings", authMiddleware, getGeneralSettings);

adminRouter.put("/settings", authMiddleware, updateGeneralSettings);

adminRouter.post("/bookings/create-payment-link", authMiddleware, createAdminPaymentLink); 

adminRouter.post('/bookings/collect-cash', authMiddleware, collectCash);

adminRouter.post('/bookings/bank-transfer', authMiddleware, createBankTransfer);

adminRouter.post('/bookings/confirm-booking', authMiddleware, confirmBooking);

// New endpoint for confirming actual payment method (hybrid Stripe/Bank Transfer)
adminRouter.put('/bookings/:id/confirm-payment-method', authMiddleware, confirmPaymentMethod);

adminRouter.post('/bookings/:id/resend-bank-transfer', authMiddleware, resendBankTransferInstructions);

// Bank Details CRUD routes
adminRouter.get('/bank-details/all', authMiddleware, getAllBankDetails);

adminRouter.post('/bank-details', authMiddleware, createBankDetails);

adminRouter.put('/bank-details/:id', authMiddleware, updateBankDetails);

adminRouter.delete('/bank-details/:id', authMiddleware, deleteBankDetails);

adminRouter.delete('/email-templates/bulk', authMiddleware, deleteBulkEmailTemplates)

adminRouter.get('/email-templates', authMiddleware, getTemplates);

adminRouter.get('/email-templates/:id', authMiddleware, getTemplateById);

adminRouter.get('/email-templates/:type/variables', authMiddleware, getTemplateVariables);

adminRouter.post('/email-templates', authMiddleware, createTemplate);

adminRouter.put('/email-templates/:id', authMiddleware, updateTemplate);

adminRouter.delete('/email-templates/:id', authMiddleware, deleteTemplate); 

adminRouter.post("/bookings/refund", authMiddleware, refund);
adminRouter.post("/bookings/future-refund", authMiddleware, processFutureRefund);

// Partial refund endpoints
adminRouter.post("/bookings/partial-refund", authMiddleware, processPartialRefund);

adminRouter.post("/bookings/custom-partial-refund", authMiddleware, processCustomPartialRefund);

adminRouter.get("/bookings/:id/refund-info", authMiddleware, getBookingRefundInfo);

adminRouter.get("/payment-intents/:id/bookings", authMiddleware, getPaymentIntentBookings);

adminRouter.get('/payment-intent/all', authMiddleware, getAllPaymentIntent);

adminRouter.post('/bookings/:id/send-confirmation', authMiddleware, sendConfirmationEmail);

adminRouter.put('/payment-intent/:id/soft-delete', authMiddleware, softDeletePaymentIntent);

adminRouter.delete('/payment-intent/:id/hard-delete', authMiddleware, hardDeletePaymentIntent);

adminRouter.put('/payment-intent/:id/restore', authMiddleware, restorePaymentIntent);

adminRouter.get('/payment-intent/soft-delete/all', authMiddleware, getAllSoftDeletedPaymentIntent);

// PaymentIntent Edit and Audit
adminRouter.put('/payment-intent/:id', authMiddleware, updatePaymentIntent);
adminRouter.get('/payment-intent/:id/audit-logs', authMiddleware, getPaymentIntentAuditLogs);

// Invoice endpoints
adminRouter.get('/payment-intent/:id/invoice', authMiddleware, generateCustomerInvoice);
adminRouter.post('/payment-intent/:id/invoice/tax-optimized', authMiddleware, generateTaxOptimizedInvoice);

adminRouter.get('/bookings/restrictions/all', authMiddleware, getAllBookingsRestriction);

adminRouter.post('/bookings/restrictions', validateMiddleware(bookingRestrictionSchema), authMiddleware, createBookingsRestriction);

adminRouter.delete('/bookings/restrictions/:id', authMiddleware, deleteBookingsRestriction);

adminRouter.put('/bookings/restrictions/:id', authMiddleware, validateMiddleware(bookingRestrictionUpdateSchema), editBookingRestriction);

adminRouter.post('/voucher/products', authMiddleware, validateMiddleware(voucherProductSchema), createVoucherProduct);

adminRouter.get('/voucher/products/all', authMiddleware, getAllVoucherProducts);

adminRouter.put('/voucher/products/:id', authMiddleware, validateMiddleware(updateVoucherProductSchema), editVoucherProduct);

adminRouter.delete('/voucher/produts/:id', authMiddleware, deleteVoucherProduct);

adminRouter.post('/vouchers', authMiddleware, validateMiddleware(voucherSchema), createVoucher);

adminRouter.get('/vouchers/all', authMiddleware, getAllVouchers);

adminRouter.get('/vouchers/:id', authMiddleware, getVouchers);

adminRouter.put('/vouchers/:id', authMiddleware, validateMiddleware(updateVoucherSchema), editVoucher);

adminRouter.delete('/vouchers/:id', authMiddleware, deleteVoucher);

adminRouter.post('/customers', authMiddleware, validateMiddleware(customerSchema), createCustomer);

adminRouter.post('/customers/send-invoice', authMiddleware, sendInvoice);

adminRouter.post('/customers/send-group-invoice', authMiddleware, sendGroupInvoice);

adminRouter.get('/customers/all', authMiddleware, getAllCustomers);

adminRouter.get('/customers/:id', authMiddleware, getCustomerById);

adminRouter.delete('/customers/:id', authMiddleware, deleteCustomer);

adminRouter.put('/customers/:id', authMiddleware, validateMiddleware(updateCustomerSchema), editCustomer);

adminRouter.get('/customers/:id/bookings', authMiddleware, getCustomerBookings);

adminRouter.get('/temp-customers/all', authMiddleware, getAllTempCustomers);

adminRouter.get('/customers/:id/charge-payments', authMiddleware, getCustomerChargePayments);

adminRouter.get('/customers/:id/relationships', authMiddleware, getCustomerRelationshipsAdmin);

adminRouter.delete('/customers/:id/relationships/:relatedId', authMiddleware, removeCustomerRelationshipAdmin);

adminRouter.put('/customers/:id/notes', authMiddleware, updateCustomerAdminNotes);

adminRouter.get('/temp-customers/:id/charge-payments', authMiddleware, getTempCustomerChargePayments);

adminRouter.get('/temp-customers/:id/orders', authMiddleware, getTempCustomerOrders);

adminRouter.get('/booking-groups', authMiddleware, getAllBookingGroups);
adminRouter.get('/booking-groups/:id', authMiddleware, getBookingGroup);
adminRouter.post('/booking-groups', authMiddleware, validateMiddleware(createBookingGroupSchema), createBookingGroup);
adminRouter.put('/booking-groups/:id', authMiddleware, validateMiddleware(updateBookingGroupSchema), updateBookingGroup);
adminRouter.delete('/booking-groups/:id', authMiddleware, deleteBookingGroup);
adminRouter.post('/booking-groups/:id/payment-intents', authMiddleware, validateMiddleware(addPaymentIntentsSchema), addPaymentIntentsToGroup);
adminRouter.post('/booking-groups/remove-payment-intents', authMiddleware, validateMiddleware(removePaymentIntentsSchema), removePaymentIntentsFromGroup);
adminRouter.get('/booking-groups/:id/audit-logs', authMiddleware, getBookingGroupAuditLogs);
adminRouter.get('/booking-groups/:id/invoice', authMiddleware, generateGroupCustomerInvoice); 
adminRouter.post('/booking-groups/:id/invoice/tax-optimized', authMiddleware, generateGroupTaxOptimizedInvoice);
adminRouter.get('/audit-logs/deletions', authMiddleware, getAllDeletionAuditLogs);

adminRouter.post('/customers/:id/payment-methods', authMiddleware, getPaymentMethodsForCustomer);

adminRouter.post('/charges/cash', authMiddleware, collectCashFromCustomer);

adminRouter.post('/charges/charge-save-card', authMiddleware, chargeSaveCard);

adminRouter.post('/charges/charge-new-card', authMiddleware, chargeNewCard);

adminRouter.post('/charges/create-qr-session', authMiddleware, createQrSession);

adminRouter.post('/charges/manual-transaction', authMiddleware, createManualTransactionCharge);

adminRouter.get('/charges/:id', authMiddleware, getChargeById);

adminRouter.get('/payment-intents/:id/charges', authMiddleware, getPaymentIntentCharges);

adminRouter.post('/charges/:id/refund', authMiddleware, refundCharge);

adminRouter.get('/notifications', authMiddleware, getNotifications);

adminRouter.get('/notifications/:id', authMiddleware, getNotificationById);

adminRouter.post('/notifications', authMiddleware, createNotification);

adminRouter.put('/notifications/:id', authMiddleware, updateNotification);

adminRouter.post('/notifications/:id/complete', authMiddleware, completeNotification);

adminRouter.delete('/notifications/:id', authMiddleware, deleteNotification);

adminRouter.get('/notifications/daily-action-list', authMiddleware, getDailyActionList);

adminRouter.delete('/notification-attachment/:id', authMiddleware, deleteNotificationAttachment);

adminRouter.get('/automated-task-rules', authMiddleware, getAutomatedTaskRules);

adminRouter.post('/automated-task-rules', authMiddleware, createAutomatedTaskRule);

adminRouter.put('/automated-task-rules/:id', authMiddleware, updateAutomatedTaskRule);

adminRouter.delete('/automated-task-rules/:id', authMiddleware, deleteAutomatedTaskRule);

adminRouter.post('/locations', authMiddleware, createLocation);

adminRouter.put('/locations/:id', authMiddleware, updateLocation);

adminRouter.delete('/locations/:id', authMiddleware, deleteLocation);

adminRouter.get('/locations/all', authMiddleware, getAllLocations);

adminRouter.get('/order-items/all', authMiddleware, getAllOrderItem);

adminRouter.post('/order-categories', authMiddleware, createOrderCategory);

adminRouter.get('/order-categories/all', authMiddleware, getAllOrderCategories);

adminRouter.put('/order-categories/:id', authMiddleware, updateOrderCategory);

adminRouter.delete('/order-categories/:id', authMiddleware, deleteOrderCategory);

adminRouter.post('/order-items', authMiddleware, validateMiddleware(createOrderItemScheme), createOrderItem);

adminRouter.put('/order-items/:id', authMiddleware, validateMiddleware(updateOrderItemsScheme), updateOrderItem);

adminRouter.delete('/order-items/:id', authMiddleware, deleteOrderItem);

adminRouter.get('/products/all', authMiddleware, getAllProducts);

adminRouter.get('/products/:id', authMiddleware, getProductById);

adminRouter.post('/products', authMiddleware, validateMiddleware(createProductSchema), createProduct);

adminRouter.put('/products/:id', authMiddleware, validateMiddleware(updateProductSchema), updateProduct);

adminRouter.delete('/products/:id', authMiddleware, deleteProduct);

adminRouter.get('/customers/orders/pending/all', authMiddleware, getAllPendingCustomersOrders);

adminRouter.get('/kitchen/orders', authMiddleware, getKitchenOrdersByUserId);

adminRouter.get('/customers/orders/assigned/all', authMiddleware, getAllAssignedCustomersOrders);

adminRouter.get('/waiter/orders', authMiddleware, getWaiterOrdersByUserId);

adminRouter.get('/waiter/orders/pending-hybrid', authMiddleware, getPendingHybridOrdersForWaiter);

adminRouter.get('/orders/:id', authMiddleware, getOrderById);

adminRouter.post('/orders/create', authMiddleware, createAdminOrder);

adminRouter.put('/orders/:id/edit', authMiddleware, editOrder);

adminRouter.put('/orders/:id/cancel', authMiddleware, cancelOrder);

adminRouter.post('/wedding-proposals', authMiddleware, validateMiddleware(createProposalSchema), createProposal);

adminRouter.get('/wedding-proposals', authMiddleware, getAllProposals);

adminRouter.get('/wedding-proposals/:id', authMiddleware, getProposalById);

adminRouter.put('/wedding-proposals/:id', authMiddleware, validateMiddleware(updateProposalSchema), updateProposal);

adminRouter.put('/wedding-proposals/:id/status', authMiddleware, validateMiddleware(updateProposalStatusSchema), updateProposalStatus);

adminRouter.delete('/wedding-proposals/:id', authMiddleware, deleteProposal);

adminRouter.put('/wedding-proposals/:proposalId/days/:dayId/items', authMiddleware, updateItineraryItems);

adminRouter.get('/wedding-proposals/:id/pdf', authMiddleware, generateProposalPDF);

adminRouter.post('/wedding-proposals/:id/send-email', authMiddleware, sendProposalEmail);

// External Vendor Routes (Admin)
adminRouter.put('/vendors/:vendorId', authMiddleware, updateExternalVendor);
adminRouter.delete('/vendors/:vendorId', authMiddleware, deleteExternalVendor);

// Bespoke Service Request Routes (Admin)
adminRouter.get('/proposals/:proposalId/service-requests', authMiddleware, getServiceRequestsForProposal);
adminRouter.get('/proposals/:proposalId/service-requests/:requestId', authMiddleware, getServiceRequestById);
adminRouter.put('/service-requests/:requestId', authMiddleware, updateServiceRequest);
adminRouter.post('/service-requests/:requestId/messages', authMiddleware, addServiceRequestMessage);


adminRouter.get('/rooms/temp-holds/all', authMiddleware, getAllTempHolds);
adminRouter.delete('/rooms/temp-holds/:id', authMiddleware, deleteTempHold);

// Revenue Management Routes
adminRouter.use('/revenue', revenueRouter);

// Beds24 Channel Manager Routes
adminRouter.use('/beds24', beds24Router);

// License Plate Management Routes
adminRouter.get('/license-plates', authMiddleware, getLicensePlateEntries);
adminRouter.get('/license-plates/stats', authMiddleware, getLicensePlateStats);
adminRouter.get('/license-plates/export', authMiddleware, exportLicensePlateEntries);
adminRouter.get('/license-plates/:id', authMiddleware, getLicensePlateEntry);
adminRouter.post('/license-plates', authMiddleware, validateMiddleware(createLicensePlateSchema), createLicensePlateEntry);
adminRouter.put('/license-plates/:id', authMiddleware, validateMiddleware(updateLicensePlateSchema), updateLicensePlateEntry);
adminRouter.delete('/license-plates/:id', authMiddleware, deleteLicensePlateEntry);

// Manual Check-In Routes
adminRouter.post('/bookings/:id/send-checkin', authMiddleware, sendManualCheckInForBooking);
adminRouter.post('/payment-intents/:id/send-checkin', authMiddleware, sendManualCheckInForPaymentIntent);
adminRouter.post('/booking-groups/:id/send-checkin', authMiddleware, sendManualCheckInForBookingGroup);

export default adminRouter;