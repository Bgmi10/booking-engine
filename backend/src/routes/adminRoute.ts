import { Router } from "express";
import { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, getAdminProfile, forgetPassword, resetPassword, logout, getAllusers, updateUserRole, deleteUser, createUser, updateAdminProfile, updateAdminPassword, uploadUrl, deleteImage, createRoomImage, createBooking, updateBooking, deleteBooking } from "../controllers/adminController";
import { createUserSchema, loginSchema } from "../zod/admin.auth.schema";
import validateMiddleware from "../middlewares/validateMiddleware";
import { createRoomSchema, updateRoomImageSchema, updateRoomSchema  } from "../zod/admin.room.schema";
import { getAllRooms } from "../controllers/roomController";
import { createCheckoutSessionSchema } from "../zod/booking.schema";

const adminRouter = Router();

adminRouter.post("/login", validateMiddleware(loginSchema), login);

adminRouter.put("/users/:id/role", updateUserRole);

adminRouter.delete("/users/:id", deleteUser);

adminRouter.post("/users", validateMiddleware(createUserSchema), createUser);

adminRouter.get("/users/all", getAllusers);

adminRouter.post("/logout", logout);    

adminRouter.get("/profile", getAdminProfile);

adminRouter.put("/profile", updateAdminProfile);

adminRouter.put("/profile/change-password", updateAdminPassword);

adminRouter.post("/forget-password", forgetPassword);

adminRouter.post("/reset-password", resetPassword);

adminRouter.post("/rooms", validateMiddleware(createRoomSchema), createRoom);

adminRouter.get("/rooms/all", getAllRooms);

adminRouter.put("/rooms/:id", validateMiddleware(updateRoomSchema), updateRoom);

adminRouter.delete("/rooms/:id", deleteRoom);

adminRouter.put("/rooms/:id/images/:imageId", validateMiddleware(updateRoomImageSchema), updateRoomImage);

//@ts-ignore
adminRouter.post("/rooms/:id/images", createRoomImage);

adminRouter.delete("/rooms/:id/images/:imageId", deleteRoomImage);

adminRouter.get("/bookings/all", getAllBookings);

adminRouter.post("/bookings", validateMiddleware(createCheckoutSessionSchema), createBooking)

adminRouter.put("/bookings/:id", updateBooking);

adminRouter.delete("/bookings/:id", deleteBooking);

adminRouter.get("/bookings/:id", getBookingById);

adminRouter.post("/upload-url", uploadUrl);

adminRouter.delete("/delete-image", deleteImage);

export default adminRouter;