import { Router } from "express";
import { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage, getAllBookings, getBookingById, addRoomsToCategory, getAllRoomCategories, getRoomCategoryById, deleteRoomCategory, updateRoomStatus } from "../controllers/adminController";
import { loginSchema } from "../zod/admin.auth.schema";
import validateMiddleware from "../middlewares/validateMiddleware";
import authMiddleware from "../middlewares/authMiddlware";
import { createRoomSchema, updateRoomImageSchema, updateRoomSchema } from "../zod/admin.room.schema";
import { getAllRooms } from "../controllers/roomController";

const adminRouter = Router();

adminRouter.post("/login", validateMiddleware(loginSchema), login);

adminRouter.post("/rooms", authMiddleware, validateMiddleware(createRoomSchema), createRoom);

adminRouter.get("/rooms/all", authMiddleware, getAllRooms);

adminRouter.put("/rooms/:id", authMiddleware, validateMiddleware(updateRoomSchema), updateRoom);

adminRouter.delete("/rooms/:id", authMiddleware, deleteRoom);

adminRouter.put("/rooms-categories/:id/images/:imageId", authMiddleware, validateMiddleware(updateRoomImageSchema), updateRoomImage);

adminRouter.delete("/rooms-categories/:id/images/:imageId", authMiddleware, deleteRoomImage);

adminRouter.get("/bookings/all", authMiddleware, getAllBookings);

adminRouter.get("/bookings/:id", authMiddleware, getBookingById);

adminRouter.post("/room-categories/:id/rooms", authMiddleware, addRoomsToCategory);

adminRouter.get("/room-categories", authMiddleware, getAllRoomCategories);

adminRouter.get("/room-categories/:id", authMiddleware, getRoomCategoryById);

adminRouter.delete("/rooms-categories/:id", authMiddleware, deleteRoomCategory);

adminRouter.put("/rooms/:id/status", authMiddleware, updateRoomStatus);

export default adminRouter;