import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';
import { stripe } from '../config/stripeConfig';
import { findOrCreatePrice, getCheckoutUrls } from '../config/stripeConfig';
import dotenv from "dotenv";

dotenv.config();

// Create or update a payment plan for a proposal
export const createOrUpdatePaymentPlan = async (req: Request, res: Response) => {
    try {
        const { proposalId } = req.params;
        const { totalAmount, currency, stages } = req.body;

        if (!proposalId) {
            responseHandler(res, 400, 'Proposal ID is required');
            return;
        }

        // Verify proposal exists
        const proposal = await prisma.weddingProposal.findUnique({
            where: { id: proposalId },
            include: { paymentPlan: { include: { stages: true } } }
        });

        if (!proposal) {
            responseHandler(res, 404, 'Wedding proposal not found');
            return;
        }

        // Create or update payment plan within a transaction
        const result = await prisma.$transaction(async (tx) => {
            // If a payment plan already exists
            if (proposal.paymentPlan) {
                // Update payment plan
                const updatedPlan = await tx.paymentPlan.update({
                    where: { id: proposal.paymentPlan.id },
                    data: {
                        totalAmount,
                        currency
                    },
                    include: { stages: true }
                });

                // Delete existing stages
                await tx.paymentStage.deleteMany({
                    where: { paymentPlanId: updatedPlan.id }
                });

                // Create new stages
                const newStages = await Promise.all(
                    stages.map((stage: any) => 
                        tx.paymentStage.create({
                            data: {
                                paymentPlanId: updatedPlan.id,
                                description: stage.description,
                                amount: stage.amount,
                                dueDate: new Date(stage.dueDate),
                                status: 'PENDING'
                            }
                        })
                    )
                );

                return { ...updatedPlan, stages: newStages };
            } else {
                // Create new payment plan
                const newPlan = await tx.paymentPlan.create({
                    data: {
                        proposalId,
                        totalAmount,
                        currency,
                        stages: {
                            create: stages.map((stage: any) => ({
                                description: stage.description,
                                amount: stage.amount,
                                dueDate: new Date(stage.dueDate),
                                status: 'PENDING'
                            }))
                        }
                    },
                    include: { stages: true }
                });

                return newPlan;
            }
        });

        responseHandler(res, 200, 'Payment plan created or updated successfully', result);
    } catch (error) {
        console.error('Error creating/updating payment plan:', error);
        handleError(res, error as Error);
    }
};

// Get payment plan for a proposal
export const getPaymentPlan = async (req: Request, res: Response) => {
    try {
        const { proposalId } = req.params;

        if (!proposalId) {
            responseHandler(res, 400, 'Proposal ID is required');
            return;
        }

        const paymentPlan = await prisma.paymentPlan.findFirst({
            where: { proposalId },
            include: { 
                stages: {
                    orderBy: { dueDate: 'asc' }
                }
            }
        });

        if (!paymentPlan) {
            responseHandler(res, 404, 'Payment plan not found for this proposal');
            return;
        }

        responseHandler(res, 200, 'Payment plan retrieved successfully', paymentPlan);
    } catch (error) {
        console.error('Error retrieving payment plan:', error);
        handleError(res, error as Error);
    }
};

// Create a payment intent for a payment stage
export const createPaymentIntent = async (req: Request, res: Response) => {
    try {
        const { stageId } = req.params;

        if (!stageId) {
            responseHandler(res, 400, 'Payment stage ID is required');
            return;
        }

        // Fetch the payment stage with related data
        const paymentStage = await prisma.paymentStage.findUnique({
            where: { id: stageId },
            include: {
                paymentPlan: {
                    include: {
                        proposal: {
                            include: {
                                customer: true
                            }
                        }
                    }
                }
            }
        });

        if (!paymentStage) {
            responseHandler(res, 404, 'Payment stage not found');
            return;
        }

        // Check if stage is already paid
        if (paymentStage.status === 'PAID') {
            responseHandler(res, 400, 'This payment stage has already been paid');
            return;
        }

        // Create or get Stripe customer
        let stripeCustomerId = paymentStage.paymentPlan.proposal.customer.stripeCustomerId;
        
        if (!stripeCustomerId) {
            // Create a new customer in Stripe
            const customer = await stripe.customers.create({
                email: paymentStage.paymentPlan.proposal.customer.guestEmail,
                name: `${paymentStage.paymentPlan.proposal.customer.guestFirstName} ${paymentStage.paymentPlan.proposal.customer.guestLastName}`,
                metadata: {
                    customerId: paymentStage.paymentPlan.proposal.customer.id
                }
            });
            
            stripeCustomerId = customer.id;
            
            // Update customer with Stripe ID
            await prisma.customer.update({
                where: { id: paymentStage.paymentPlan.proposal.customer.id },
                data: { stripeCustomerId }
            });
        }

        // Use the findOrCreatePrice helper function to create a price for the line item
        const priceId = await findOrCreatePrice({
            name: `${paymentStage.description} - ${paymentStage.paymentPlan.proposal.name}`,
            description: `Wedding payment for ${paymentStage.paymentPlan.proposal.name}`,
            unitAmount: Math.round(paymentStage.amount * 100),
            currency: paymentStage.paymentPlan.currency,
            bookingIndex: Date.now() // Use timestamp to ensure uniqueness
        });

        // Get checkout URLs from the config
        const { successUrl, cancelUrl } = getCheckoutUrls();

        // Create a checkout session with the correct parameters
        //@ts-ignore
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            mode: 'payment',
            success_url: successUrl + `&stageId=${paymentStage.id}`,
            cancel_url: cancelUrl + `?stageId=${paymentStage.id}`,
            customer: stripeCustomerId,
            payment_intent_data: {
                metadata: {
                    paymentStageId: paymentStage.id,
                    proposalId: paymentStage.paymentPlan.proposalId,
                    description: paymentStage.description
                }
            },
            metadata: {
                paymentStageId: paymentStage.id,
                proposalId: paymentStage.paymentPlan.proposalId,
                description: paymentStage.description
            },
            expires_at:  Math.floor((Date.now() + 30 * 60 * 1000) / 1000)
        });

        // Update the payment stage with Stripe details
        const updatedStage = await prisma.paymentStage.update({
            where: { id: stageId },
            data: {
                stripePaymentIntentId: session.id, // Store the session ID here for now
                stripePaymentUrl: session.url,
                status: 'PROCESSING'
            }
        });

        responseHandler(res, 200, 'Payment checkout session created successfully', {
            paymentStage: updatedStage,
            paymentUrl: session.url
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        handleError(res, error as Error);
    }
};

// Get payment stage by ID
export const getPaymentStage = async (req: Request, res: Response) => {
    try {
        const { stageId } = req.params;
        
        if (!stageId) {
            responseHandler(res, 400, 'Payment stage ID is required');
            return;
        }
        
        const paymentStage = await prisma.paymentStage.findUnique({
            where: { id: stageId },
            include: {
                paymentPlan: {
                    include: {
                        proposal: true
                    }
                }
            }
        });
        
        if (!paymentStage) {
            responseHandler(res, 404, 'Payment stage not found');
            return;
        }
        
        responseHandler(res, 200, 'Payment stage retrieved successfully', paymentStage);
    } catch (error) {
        console.error('Error retrieving payment stage:', error);
        handleError(res, error as Error);
    }
};

// Delete a payment stage
export const deletePaymentStage = async (req: Request, res: Response) => {
    try {
        const { stageId } = req.params;

        if (!stageId) {
            responseHandler(res, 400, 'Payment stage ID is required');
            return;
        }

        // Check if the stage exists and is not paid
        const stage = await prisma.paymentStage.findUnique({
            where: { id: stageId }
        });

        if (!stage) {
            responseHandler(res, 404, 'Payment stage not found');
            return;
        }

        if (stage.status === 'PAID' || stage.status === 'PROCESSING') {
            responseHandler(res, 400, 'Cannot delete a paid or processing payment stage');
            return;
        }

        // Delete the payment stage
        await prisma.paymentStage.delete({
            where: { id: stageId }
        });

        responseHandler(res, 200, 'Payment stage deleted successfully');
    } catch (error) {
        console.error('Error deleting payment stage:', error);
        handleError(res, error as Error);
    }
}; 