import { Router } from "express";
import { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, updateBooking, deleteBooking, createEnhancement, deleteEnhancement, updateEnhancement, getAllEnhancements, getAllRatePolicies, createRatePolicy, updateRatePolicy, deleteRatePolicy, bulkPoliciesUpdate, updateBasePrice, updateRoomPrice, updateGeneralSettings, getGeneralSettings, createAdminPaymentLink } from "../controllers/adminController";
import { createUserSchema, loginSchema } from "../zod/admin.auth.schema";
import validateMiddleware from "../middlewares/validateMiddleware";
import { createRoomSchema, updateRoomImageSchema, updateRoomSchema  } from "../zod/admin.room.schema";
import { getAllRooms } from "../controllers/roomController";
import { createEnhancementSchema, updateEnhancementSchema } from "../zod/enhancement.schema";
import authMiddleware from "../middlewares/authMiddlware";
import { createRatePolicySchema, updateRatePolicySchema } from "../zod/ratepolicy.schema";
import { getTemplateById, getTemplates, getTemplateVariables, createTemplate, updateTemplate, deleteTemplate } from "../controllers/emailTemplateController";
import { refund } from "../controllers/adminController";

const adminRouter = Router();

adminRouter.post("/login",  validateMiddleware(loginSchema), login);

adminRouter.put("/users/:id/role", authMiddleware, updateUserRole);

adminRouter.delete("/users/:id", authMiddleware, deleteUser);

adminRouter.post("/users", authMiddleware, validateMiddleware(createUserSchema), createUser);

adminRouter.get("/users/all", authMiddleware, getAllusers);

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

adminRouter.get('/email-templates', getTemplates);

adminRouter.get('/email-templates/:id', getTemplateById);

adminRouter.get('/email-templates/:type/variables', getTemplateVariables);

adminRouter.post('/email-templates', createTemplate);

adminRouter.put('/email-templates/:id', updateTemplate);

adminRouter.delete('/email-templates/:id', deleteTemplate); 

adminRouter.post("/bookings/refund", authMiddleware, refund);

export default adminRouter;