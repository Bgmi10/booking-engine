import { Router } from "express";
import { login, createRoom, updateRoom, deleteRoom, updateRoomImage, deleteRoomImage } from "../controllers/adminController";
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

adminRouter.put("/rooms/:id/images/:imageId", authMiddleware, validateMiddleware(updateRoomImageSchema), updateRoomImage);

adminRouter.delete("/rooms/:id/images/:imageId", authMiddleware, deleteRoomImage);

export default adminRouter;