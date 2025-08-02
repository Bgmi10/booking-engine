import { Router } from 'express';
import {
  getRateDatePrices,
  upsertRateDatePrices,
  deleteRateDatePrice,
  getRatePricesForDateRange
} from '../controllers/rateDatePriceController';
import authMiddleware from '../middlewares/authMiddlware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get rate date prices for a specific rate policy and date range
router.get('/:ratePolicyId/date-prices', getRateDatePrices);

// Get specific rate prices for a date range (used by booking system)
router.get('/:ratePolicyId/prices-for-dates', getRatePricesForDateRange);

// Create or update rate date prices (bulk operation)
router.post('/:ratePolicyId/date-prices', upsertRateDatePrices);

// Delete a specific rate date price
router.delete('/:ratePolicyId/date-prices/:id', deleteRateDatePrice);

export default router;