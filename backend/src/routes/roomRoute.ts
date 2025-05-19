import { Router } from "express";
import { getAllRooms, getRoomById, getCalendarAvailability, checkRoomAvailability, getAvailableRooms } from "../controllers/roomController";

const roomsRouter = Router();

roomsRouter.get("/all", getAllRooms);

roomsRouter.get("/:id", getRoomById);

roomsRouter.get("/availability/calendar", getCalendarAvailability);

roomsRouter.post("/:id/availability", checkRoomAvailability);

roomsRouter.post("/availablerooms", getAvailableRooms);

export default roomsRouter;
