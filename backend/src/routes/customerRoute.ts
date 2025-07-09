import Router from "express";
import { 
    getOrderItemsByLocation, 
    loginCustomer, 
    getCustomerProfile, 
    customerLogout, 
    createOrder,
    getOccupiedRooms,
    weddingPortalLogin,
    weddingPortalActivateAccount,
    weddingPortalInitiatePasswordReset,
    weddingPortalResetPassword,
    getAllCustomerProposals,
    updateItinerary,
    updateMainGuestCount,
} from "../controllers/customerController";
import {
    getProposalDetails,
    acceptProposal,
    getPaymentPlan,
    confirmFinalGuestNumbers
} from '../controllers/customerController';
import { generateProposalPDF } from '../controllers/proposalController';
import customerAuthMiddleware from "../middlewares/customerAuthMiddleware";
import { getAllProducts } from "../controllers/productController";

const customerRouter = Router();

// Order Portal Routes
customerRouter.get('/order-items', getOrderItemsByLocation);
customerRouter.get('/occupied-rooms', getOccupiedRooms);
customerRouter.post('/login', loginCustomer);
customerRouter.get('/profile', customerAuthMiddleware, getCustomerProfile);
customerRouter.post('/logout', customerLogout);
customerRouter.post('/orders', customerAuthMiddleware, createOrder);

// Wedding Portal Authentication Routes
customerRouter.post('/wedding-portal-login', weddingPortalLogin);
customerRouter.post('/wedding-portal-activate-account', weddingPortalActivateAccount);
customerRouter.post('/wedding-portal-initiate-password-reset', weddingPortalInitiatePasswordReset);
customerRouter.post('/wedding-portal-reset-password', weddingPortalResetPassword);

customerRouter.get('/products/all', customerAuthMiddleware, getAllProducts);

// Wedding Proposal Routes (Protected by customerAuthMiddleware)
customerRouter.get('/proposals', customerAuthMiddleware, getAllCustomerProposals);
customerRouter.get('/proposals/:proposalId', customerAuthMiddleware, getProposalDetails);
customerRouter.get('/proposals/:id/download', customerAuthMiddleware, generateProposalPDF);
customerRouter.put('/proposals/:proposalId/guest-count', customerAuthMiddleware, updateMainGuestCount);
customerRouter.put('/proposals/:proposalId/itinerary', customerAuthMiddleware, updateItinerary);
customerRouter.post('/proposals/:proposalId/accept', customerAuthMiddleware, acceptProposal);
customerRouter.get('/proposals/:proposalId/payment-plan', customerAuthMiddleware, getPaymentPlan);
customerRouter.post('/proposals/:proposalId/confirm-guests', customerAuthMiddleware, confirmFinalGuestNumbers);

export default customerRouter;