import { Router } from 'express';
import {
  getRoomDatePrices,
  upsertRoomDatePrices,
  deleteRoomDatePrice,
  getRoomPricesForDateRange
} from '../controllers/roomDatePriceController';
import authMiddleware from '../middlewares/authMiddlware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get room date prices for a specific date range
router.get('/date-prices', getRoomDatePrices);

// Get specific room prices for a date range (used by booking system)
router.get('/prices-for-dates', getRoomPricesForDateRange);

// Create or update room date prices (bulk operation)
router.post('/date-prices', upsertRoomDatePrices);

// Delete a specific room date price
router.delete('/date-prices/:id', deleteRoomDatePrice);

export default router;