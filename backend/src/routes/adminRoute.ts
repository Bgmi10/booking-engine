import { Router } from "express";
import { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, updateBooking, deleteBooking, createEnhancement, deleteEnhancement, updateEnhancement, getAllEnhancements, getAllRatePolicies, createRatePolicy, updateRatePolicy, deleteRatePolicy, bulkPoliciesUpdate, updateBasePrice, updateRoomPrice, updateGeneralSettings, getGeneralSettings, createAdminPaymentLink, getAllPaymentIntent, deletePaymentIntent, sendConfirmationEmail, getAllBookingsRestriction, createBookingsRestriction, deleteBookingsRestriction, editBookingRestriction, getUserByID } from "../controllers/adminController";
import { createUserSchema, loginSchema } from "../zod/admin.auth.schema";
import validateMiddleware from "../middlewares/validateMiddleware";
import { createRoomSchema, updateRoomImageSchema, updateRoomSchema  } from "../zod/admin.room.schema";
import { getAllRooms } from "../controllers/roomController";
import { createEnhancementSchema, updateEnhancementSchema } from "../zod/enhancement.schema";
import authMiddleware from "../middlewares/authMiddlware";
import { createRatePolicySchema, updateRatePolicySchema } from "../zod/ratepolicy.schema";
import { getTemplateById, getTemplates, getTemplateVariables, createTemplate, updateTemplate, deleteTemplate } from "../controllers/emailTemplateController";
import { refund } from "../controllers/adminController";
import { bookingRestrictionSchema, bookingRestrictionUpdateSchema } from "../zod/booking.schema";
import { createVoucher, createVoucherProduct, deleteVoucher, deleteVoucherProduct, editVoucher, editVoucherProduct, getAllVoucherProducts, getAllVouchers, getVouchers } from "../controllers/voucherController";
import { updateVoucherProductSchema, updateVoucherSchema, voucherProductSchema, voucherSchema } from "../zod/voucher.scheme";
import { createCustomer, deleteCustomer, editCustomer, getAllCustomers, getCustomerBookings, getCustomerChargePayments, getPaymentMethodsForCustomer } from "../controllers/customerController";
import { customerSchema } from "../zod/customer.schema";
import { updateCustomerSchema } from "../zod/customer.schema";
import { createBookingsGroup } from "../controllers/groupController";
import { chargeNewCard, chargeSaveCard, createQrSession, getChargeById, refundCharge } from "../controllers/chargeController";
import { createManualTransactionCharge } from "../controllers/chargeController";

const adminRouter = Router();

adminRouter.post("/login",  validateMiddleware(loginSchema), login);

adminRouter.put("/users/:id/role", authMiddleware, updateUserRole);

adminRouter.delete("/users/:id", authMiddleware, deleteUser);

adminRouter.post("/users", authMiddleware, validateMiddleware(createUserSchema), createUser);

adminRouter.get("/users/all", authMiddleware, getAllusers);

adminRouter.get("/users/:id", authMiddleware, getUserByID);

adminRouter.get("/logout", logout);    

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

adminRouter.get("/settings", authMiddleware, getGeneralSettings);

adminRouter.put("/settings", authMiddleware, updateGeneralSettings);

adminRouter.post("/create-payment-link", authMiddleware, createAdminPaymentLink);

adminRouter.get('/email-templates', authMiddleware, getTemplates);

adminRouter.get('/email-templates/:id', authMiddleware, getTemplateById);

adminRouter.get('/email-templates/:type/variables', authMiddleware, getTemplateVariables);

adminRouter.post('/email-templates', authMiddleware, createTemplate);

adminRouter.put('/email-templates/:id', authMiddleware, updateTemplate);

adminRouter.delete('/email-templates/:id', authMiddleware, deleteTemplate); 

adminRouter.post("/bookings/refund", authMiddleware, refund);

adminRouter.get('/payment-intent/all', authMiddleware, getAllPaymentIntent);

adminRouter.post('/bookings/:id/send-confirmation', authMiddleware, sendConfirmationEmail);

adminRouter.delete('/payment-intent/:id/delete', authMiddleware, deletePaymentIntent);

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

adminRouter.get('/customers/all', authMiddleware, getAllCustomers);

adminRouter.delete('/customers/:id', authMiddleware, deleteCustomer);

adminRouter.put('/customers/:id', authMiddleware, validateMiddleware(updateCustomerSchema), editCustomer);

adminRouter.get('/customers/:id/bookings', authMiddleware, getCustomerBookings);

adminRouter.get('/customers/:id/charge-payments', authMiddleware, getCustomerChargePayments);

adminRouter.post('/bookings/group', authMiddleware, createBookingsGroup);

adminRouter.post('/customers/:id/payment-methods', authMiddleware, getPaymentMethodsForCustomer);

adminRouter.post('/charges/charge-save-card', authMiddleware, chargeSaveCard);

adminRouter.post('/charges/charge-new-card', authMiddleware, chargeNewCard);

adminRouter.post('/charges/create-qr-session', authMiddleware, createQrSession);

adminRouter.post('/charges/manual-transaction', authMiddleware, createManualTransactionCharge);

adminRouter.get('/charges/:id', authMiddleware, getChargeById);

adminRouter.post('/charges/:id/refund', authMiddleware, refundCharge);
export default adminRouter;