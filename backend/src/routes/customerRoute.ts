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
    getProposalDetails,
    acceptProposal,
    getPaymentPlan,
    confirmFinalGuestNumbers,
    editCustomer,
    verifyOnlineCheckInToken,
    getGuestDetails,
    createManualGuest,
    inviteBookingGuest,
    deleteGuest,
    applyGuestToAllBookings,
    createNewRelationships,
    deleteRelationships,
    quickAddGuests,
    getRelatedGuests,
    verifyEventInvitation,
    acceptEventInvitation,
    declineEventInvitation,
    addGuestToEvent,
    getEventGuestsList
} from "../controllers/customerController";
import { generateProposalPDF } from '../controllers/proposalController';
import customerAuthMiddleware from "../middlewares/customerAuthMiddleware";
import { 
    createExternalVendor, 
    getExternalVendorsForProposal 
} from '../controllers/externalVendorController';
import { 
    createServiceRequest, 
    getServiceRequestById,
    addServiceRequestMessage,
    acceptServiceRequestQuote,
    rejectServiceRequestQuote
} from '../controllers/serviceRequestController';
import { getAllProducts } from "../controllers/productController";
import { getAllRooms } from "../controllers/roomController";
import { onlineCheckInMiddleware } from "../middlewares/onlineCheckinMiddleware";

const customerRouter = Router();

// Order Portal Routes
customerRouter.get('/order-items', getOrderItemsByLocation);
customerRouter.get('/occupied-rooms', getOccupiedRooms);
customerRouter.get('/all-rooms', getAllRooms);
customerRouter.post('/login', loginCustomer);
customerRouter.get('/profile', customerAuthMiddleware, getCustomerProfile);
customerRouter.post('/logout', customerLogout);
customerRouter.post('/orders', customerAuthMiddleware, createOrder);
customerRouter.get('/products/all', getAllProducts);
customerRouter.put('/profile/:id', editCustomer);
customerRouter.post('/online-checkin/verify-token', verifyOnlineCheckInToken);
customerRouter.get('/online-checkin/guest-details', onlineCheckInMiddleware, getGuestDetails);

// relationships
customerRouter.get('/relationships', onlineCheckInMiddleware, getRelatedGuests);
customerRouter.post('/relationships', onlineCheckInMiddleware, createNewRelationships);
customerRouter.delete('/relationships/:id', onlineCheckInMiddleware, deleteRelationships);
customerRouter.post('/quick-add-guests', onlineCheckInMiddleware, quickAddGuests);

//   Routes (Protected by onlineCheckInMiddleware)
customerRouter.post('/online-checkin/guests/manual', onlineCheckInMiddleware, createManualGuest);
customerRouter.post('/online-checkin/guests/invite', onlineCheckInMiddleware, inviteBookingGuest);
customerRouter.delete('/online-checkin/bookings/:bookingId/guests/:guestId', onlineCheckInMiddleware, deleteGuest);
customerRouter.post('/online-checkin/apply-guest-to-all', onlineCheckInMiddleware, applyGuestToAllBookings);

// Wedding Portal Authentication Routes
customerRouter.post('/wedding-portal-login', weddingPortalLogin);
customerRouter.post('/wedding-portal-activate-account', weddingPortalActivateAccount);
customerRouter.post('/wedding-portal-initiate-password-reset', weddingPortalInitiatePasswordReset);
customerRouter.post('/wedding-portal-reset-password', weddingPortalResetPassword);

// Wedding Proposal Routes (Protected by customerAuthMiddleware)
customerRouter.get('/proposals', customerAuthMiddleware, getAllCustomerProposals);
customerRouter.get('/proposals/:proposalId', customerAuthMiddleware, getProposalDetails);
customerRouter.get('/proposals/:id/download', customerAuthMiddleware, generateProposalPDF);
customerRouter.put('/proposals/:proposalId/guest-count', customerAuthMiddleware, updateMainGuestCount);
customerRouter.put('/proposals/:proposalId/itinerary', customerAuthMiddleware, updateItinerary);
customerRouter.post('/proposals/:proposalId/accept', customerAuthMiddleware, acceptProposal);
customerRouter.get('/proposals/:proposalId/payment-plan', customerAuthMiddleware, getPaymentPlan);
customerRouter.post('/proposals/:proposalId/confirm-guests', customerAuthMiddleware, confirmFinalGuestNumbers);

// External Vendor Routes (Customer)
customerRouter.post('/proposals/:proposalId/vendors', customerAuthMiddleware, createExternalVendor);
customerRouter.get('/proposals/:proposalId/vendors', customerAuthMiddleware, getExternalVendorsForProposal);

// Bespoke Service Request Routes (Customer)
customerRouter.post('/proposals/:proposalId/service-requests', customerAuthMiddleware, createServiceRequest);
customerRouter.get('/proposals/:proposalId/service-requests/:requestId', customerAuthMiddleware, getServiceRequestById);
customerRouter.post('/service-requests/:requestId/messages', customerAuthMiddleware, addServiceRequestMessage);
customerRouter.post('/service-requests/:requestId/accept', customerAuthMiddleware, acceptServiceRequestQuote);
customerRouter.post('/service-requests/:requestId/reject', customerAuthMiddleware, rejectServiceRequestQuote);

// Event Invitation Routes (Public - no auth required as token is the auth)
customerRouter.get('/event-invitation/:token/verify', verifyEventInvitation);
customerRouter.post('/event-invitation/:token/accept', acceptEventInvitation);
customerRouter.post('/event-invitation/:token/decline', declineEventInvitation);
customerRouter.post('/event-invitation/:token/add-guest', addGuestToEvent);
customerRouter.get('/event-invitation/:token/guests', getEventGuestsList);

export default customerRouter;