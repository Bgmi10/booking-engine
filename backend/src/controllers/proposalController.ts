import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';
import { generatePDF, compileTemplate, getOrGeneratePDF } from '../utils/pdfGenerator';
import Handlebars from 'handlebars';
import { EmailService } from '../services/emailService';
import { CustomerAuthService } from '../services/customerAuthService';
import { ItineraryNotificationService } from '../services/itineraryNotificationService';

// Format currency helper
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
};

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Handlebars.registerHelper('formatDate', function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

Handlebars.registerHelper('stringify', function(obj) {
    return JSON.stringify(obj, null, 2);
});

Handlebars.registerHelper('calculateDayTotal', function(day: any) {
    const total = day.items.reduce((sum: number, item: any) => sum + Number(item.price), 0);
    return formatCurrency(total);
});

Handlebars.registerHelper('formatCurrency', function(amount: number) {
    return formatCurrency(amount);
});

Handlebars.registerHelper('currentYear', function() {
    return new Date().getFullYear();
});

export const createProposal = async (req: Request, res: Response) => {
    try {
        // Start a transaction to handle the complex structure
        const proposal = await prisma.$transaction(async (tx) => {
            // Create the base proposal
            const newProposal = await tx.weddingProposal.create({
                data: {
                    name: req.body.name,
                    weddingDate: new Date(req.body.weddingDate),
                    mainGuestCount: req.body.mainGuestCount,
                    customerId: req.body.customerId,
                    termsAndConditions: req.body.termsAndConditions,
                    // Create days and items in a nested way
                    itineraryDays: {
                        //@ts-ignore
                        create: req.body.itineraryDays.map(day => ({
                            dayNumber: day.dayNumber,
                            date: new Date(day.date),
                            items: day.items ? {
                                create: day.items.map((item: any) => {
                                    // Get the product to ensure it exists and get its current price
                                    return {
                                        productId: item.productId,
                                        guestCount: item.guestCount,
                                        status: item.status,
                                        price: item.price, // Use provided price or calculate based on product
                                        notes: item.notes,
                                        customMenu: item.customMenu,
                                    };
                                })
                            } : undefined
                        }))
                    },
                    // Create payment plan if provided
                    paymentPlan: req.body.paymentPlan ? {
                        create: {
                            totalAmount: req.body.paymentPlan.totalAmount,
                            stages: req.body.paymentPlan.stages
                        }
                    } : undefined
                },
                include: {
                    itineraryDays: {
                        include: {
                            items: {
                                include: {
                                    product: true
                                }
                            }
                        }
                    },
                    paymentPlan: true,
                    customer: true
                }
            });
            
            return newProposal;
        });
        
        responseHandler(res, 201, 'Wedding proposal created successfully', proposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getProposalById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const proposal = await prisma.weddingProposal.findUnique({
            where: { id },
            include: {
                itineraryDays: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    },
                    orderBy: { dayNumber: 'asc' }
                },
                customer: true,
                paymentPlan: true,
            }
        });
        
        if (!proposal) {
            responseHandler(res, 404, 'Wedding proposal not found');
            return;
        }
        
        responseHandler(res, 200, 'Wedding proposal fetched successfully', proposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const getAllProposals = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const where: any = {};
        
        if (status) {
            where.status = status;
        }
        
        const proposals = await prisma.weddingProposal.findMany({
            where,
            include: {
                customer: {
                    select: {
                        guestFirstName: true,
                        guestLastName: true,
                        guestEmail: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        responseHandler(res, 200, 'Wedding proposals fetched successfully', proposals);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateProposal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Check if proposal exists
        const existingProposal = await prisma.weddingProposal.findUnique({
            where: { id },
            include: {
                itineraryDays: {
                    include: {
                        items: true
                    }
                },
                paymentPlan: true
            }
        });
        
        if (!existingProposal) {
            responseHandler(res, 404, 'Wedding proposal not found');
            return;
        }
        
        // Update the basic proposal data
        const updatedProposal = await prisma.$transaction(async (tx) => {
            // Update basic fields
            const updated = await tx.weddingProposal.update({
                where: { id },
                data: {
                    name: req.body.name,
                    weddingDate: req.body.weddingDate ? new Date(req.body.weddingDate) : undefined,
                    mainGuestCount: req.body.mainGuestCount,
                    customerId: req.body.customerId,
                    termsAndConditions: req.body.termsAndConditions,
                },
                include: {
                    itineraryDays: {
                        include: {
                            items: {
                                include: {
                                    product: true
                                }
                            }
                        },
                        orderBy: { dayNumber: 'asc' }
                    },
                    paymentPlan: true,
                    customer: true
                }
            });
            
            return updated;
        });
        
        responseHandler(res, 200, 'Wedding proposal updated successfully', updatedProposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateProposalStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const proposal = await prisma.weddingProposal.update({
            where: { id },
            data: { status }
        });
        
        responseHandler(res, 200, `Wedding proposal status updated to ${status}`, proposal);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const deleteProposal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        await prisma.weddingProposal.delete({
            where: { id }
        });
        
        responseHandler(res, 200, 'Wedding proposal deleted successfully');
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const updateItineraryItems = async (req: Request, res: Response) => {
    const { proposalId, dayId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
        responseHandler(res, 400, 'Items array is required');
        return;
    }

    try {
        // Fetch the day with existing items for comparison (to detect changes)
        const day = await prisma.itineraryDay.findFirst({
            where: {
                id: dayId,
                proposalId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!day) {
            responseHandler(res, 404, 'Itinerary day not found or does not belong to this proposal');
            return;
        }

        // Fetch all days for the proposal to use for notification
        const allDays = await prisma.itineraryDay.findMany({
            where: {
                proposalId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                dayNumber: 'asc'
            }
        });

        // Store previous state for comparison
        const previousState = [...allDays];

        // Start a transaction to handle the complex update
        const result = await prisma.$transaction(async (tx) => {
            // 1. Delete all existing items for this day
            await tx.itineraryItem.deleteMany({
                where: {
                    dayId
                }
            });

            // 2. Create new items
            if (items.length > 0) {
                await tx.itineraryItem.createMany({
                    data: items.map((item: any) => ({
                        dayId,
                        productId: item.productId,
                        guestCount: item.guestCount,
                        status: item.status,
                        price: item.price,
                        notes: item.notes,
                        customMenu: item.customMenu
                    }))
                });
            }

            // 3. Fetch the updated day with items
            return await tx.itineraryDay.findUnique({
                where: { id: dayId },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
        });

        // Fetch the updated state of all days for the proposal
        const updatedAllDays = await prisma.itineraryDay.findMany({
            where: {
                proposalId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                dayNumber: 'asc'
            }
        });

        // Send notification about the changes
        // Use a non-blocking approach to not delay the response
        ItineraryNotificationService.sendItineraryChangeNotification(
            proposalId,
            previousState,
            'admin'
        ).catch(error => {
            console.error('Failed to send itinerary change notification:', error);
        });

        responseHandler(res, 200, 'Itinerary items updated successfully', result);
    } catch (error) {
        handleError(res, error as Error);
    }
};

export const generateProposalPDF = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Proposal ID is required");
        return;
    }

    try {
        // Get proposal details from database
        const proposal = await prisma.weddingProposal.findUnique({
            where: { id },
            include: {
                itineraryDays: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    },
                    orderBy: { dayNumber: 'asc' }
                },
                paymentPlan: true,
                customer: true
            }
        });

        if (!proposal) {
            responseHandler(res, 404, 'Wedding proposal not found');
            return;
        }

        // Calculate total price
        const totalAmount = proposal.itineraryDays.reduce((total, day) => {
            return total + day.items.reduce((sum, item) => sum + item.price, 0);
        }, 0);

        // Format currency
        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount);
        };

        // Get the PDF template
        const pdfTemplate = await prisma.emailTemplate.findFirst({
            where: { type: 'WEDDING_PROPOSAL_PDF', isActive: true }
        });
        if (!pdfTemplate) throw new Error('PDF template not found');

        // Generate PDF
        const pdfBuffer = await getOrGeneratePDF(id, {
            template: {
                id: pdfTemplate.id,
                version: pdfTemplate.version,
                isActive: pdfTemplate.isActive
            },
            data: {
                id: proposal.id,
                name: proposal.name,
                status: proposal.status.toLowerCase(),
                weddingDate: new Date(proposal.weddingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                mainGuestCount: proposal.mainGuestCount,
                customer: {
                    guestFirstName: proposal.customer.guestFirstName,
                    guestLastName: proposal.customer.guestLastName,
                    guestEmail: proposal.customer.guestEmail
                },
                itineraryDays: proposal.itineraryDays.map(day => ({
                    dayNumber: day.dayNumber,
                    date: new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    items: day.items.map(item => ({
                        product: {
                            name: item.product.name,
                            description: item.product.description || ''
                        },
                        guestCount: item.guestCount,
                        status: item.status,
                        price: formatCurrency(item.price),
                        customMenu: item.customMenu
                    }))
                })),
                paymentPlan: proposal.paymentPlan ? {
                    totalAmount: formatCurrency(proposal.paymentPlan.totalAmount),
                    currency: 'EUR',
                    stages: (proposal.paymentPlan as any).stages.map((stage: any) => ({
                        description: stage.description,
                        amount: formatCurrency(stage.amount),
                        dueDate: new Date(stage.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        status: stage.status
                    }))
                } : null,
                termsAndConditions: proposal.termsAndConditions,
                calculateTotalPrice: formatCurrency(totalAmount),
                currentYear: new Date().getFullYear()
            }
        }, async () => {
            const htmlContent = compileTemplate(pdfTemplate.html, {
                id: proposal.id,
                name: proposal.name,
                status: proposal.status.toLowerCase(),
                weddingDate: new Date(proposal.weddingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                mainGuestCount: proposal.mainGuestCount,
                customer: proposal.customer,
                itineraryDays: proposal.itineraryDays,
                paymentPlan: proposal.paymentPlan,
                termsAndConditions: proposal.termsAndConditions,
                calculateTotalPrice: formatCurrency(totalAmount),
                currentYear: new Date().getFullYear()
            });

            return await generatePDF(htmlContent);
        });

        // Send response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=proposal-${id}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating PDF:", error);
        handleError(res, error as Error);
    }
};

export const sendProposalEmail = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        responseHandler(res, 400, "Proposal ID is required");
        return;
    }

    try {
        // Get proposal details from database
        const proposal = await prisma.weddingProposal.findUnique({
            where: { id },
            include: {
                itineraryDays: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    },
                    orderBy: { dayNumber: 'asc' }
                },
                paymentPlan: {
                    include: {
                        stages: true
                    }
                },
                customer: true
            }
        });

        if (!proposal) {
            responseHandler(res, 404, 'Wedding proposal not found');
            return;
        }

        // Generate activation token for the customer
        const activationToken = await CustomerAuthService.generateActivationLink(proposal.customerId);

        // Construct customer portal URL with activation details
        const customerPortalUrl = `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/wedding-portal/activate-account?email=${encodeURIComponent(proposal.customer.guestEmail)}&token=${activationToken}`;

        // Calculate total price
        const totalAmount = proposal.itineraryDays.reduce((total, day) => {
            return total + day.items.reduce((sum, item) => sum + item.price, 0);
        }, 0);

        // Format currency
        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount);
        };

        // Get the PDF template
        const pdfTemplate = await prisma.emailTemplate.findFirst({
            where: { type: 'WEDDING_PROPOSAL_PDF', isActive: true }
        });
        if (!pdfTemplate) throw new Error('PDF template not found');

        // Generate PDF
        const pdfBuffer = await getOrGeneratePDF(id, {
            template: {
                id: pdfTemplate.id,
                version: pdfTemplate.version,
                isActive: pdfTemplate.isActive
            },
            data: {
                id: proposal.id,
                name: proposal.name,
                status: proposal.status.toLowerCase(),
                weddingDate: new Date(proposal.weddingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                mainGuestCount: proposal.mainGuestCount,
                customer: {
                    guestFirstName: proposal.customer.guestFirstName,
                    guestLastName: proposal.customer.guestLastName,
                    guestEmail: proposal.customer.guestEmail
                },
                itineraryDays: proposal.itineraryDays.map(day => ({
                    dayNumber: day.dayNumber,
                    date: new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    items: day.items.map(item => ({
                        product: {
                            name: item.product.name,
                            description: item.product.description || ''
                        },
                        guestCount: item.guestCount,
                        status: item.status,
                        price: formatCurrency(item.price),
                        customMenu: item.customMenu
                    }))
                })),
                paymentPlan: proposal.paymentPlan ? {
                    totalAmount: formatCurrency(proposal.paymentPlan.totalAmount),
                    currency: 'EUR',
                    stages: (proposal.paymentPlan as any).stages.map((stage: any) => ({
                        description: stage.description,
                        amount: formatCurrency(stage.amount),
                        dueDate: new Date(stage.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        status: stage.status
                    }))
                } : null,
                termsAndConditions: proposal.termsAndConditions,
                calculateTotalPrice: formatCurrency(totalAmount),
                currentYear: new Date().getFullYear(),
                customerPortalUrl: customerPortalUrl
            }
        }, async () => {
            const htmlContent = compileTemplate(pdfTemplate.html, {
                id: proposal.id,
                name: proposal.name,
                status: proposal.status.toLowerCase(),
                weddingDate: new Date(proposal.weddingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                mainGuestCount: proposal.mainGuestCount,
                customer: proposal.customer,
                itineraryDays: proposal.itineraryDays.map(day => ({
                    dayNumber: day.dayNumber,
                    date: new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    items: day.items.map(item => ({
                        product: {
                            name: item.product.name,
                            description: item.product.description || ''
                        },
                        guestCount: item.guestCount,
                        status: item.status,
                        price: formatCurrency(item.price),
                        customMenu: item.customMenu
                    }))
                })),
                paymentPlan: proposal.paymentPlan ? {
                    totalAmount: formatCurrency(proposal.paymentPlan.totalAmount),
                    currency: 'EUR',
                    stages: (proposal.paymentPlan as any).stages.map((stage: any) => ({
                        description: stage.description,
                        amount: formatCurrency(stage.amount),
                        dueDate: new Date(stage.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        status: stage.status
                    }))
                } : null,
                termsAndConditions: proposal.termsAndConditions,
                calculateTotalPrice: formatCurrency(totalAmount),
                currentYear: new Date().getFullYear(),
                customerPortalUrl: customerPortalUrl
            });

            return await generatePDF(htmlContent);
        });

        // Send email with PDF attachment
        await EmailService.sendEmail({
            to: {
                email: proposal.customer.guestEmail,
                name: `${proposal.customer.guestFirstName} ${proposal.customer.guestLastName}`
            },
            templateType: 'WEDDING_PROPOSAL',
            templateData: {
                id: proposal.id,
                name: proposal.name,
                status: proposal.status.toLowerCase(),
                weddingDate: new Date(proposal.weddingDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                mainGuestCount: proposal.mainGuestCount,
                customer: proposal.customer,
                itineraryDays: proposal.itineraryDays.map(day => ({
                    dayNumber: day.dayNumber,
                    date: new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    items: day.items.map(item => ({
                        product: {
                            name: item.product.name,
                            description: item.product.description || ''
                        },
                        guestCount: item.guestCount,
                        status: item.status,
                        price: formatCurrency(item.price),
                        customMenu: item.customMenu
                    }))
                })),
                paymentPlan: proposal.paymentPlan ? {
                    totalAmount: formatCurrency(proposal.paymentPlan.totalAmount),
                    currency: 'EUR',
                    stages: (proposal.paymentPlan as any).stages.map((stage: any) => ({
                        description: stage.description,
                        amount: formatCurrency(stage.amount),
                        dueDate: new Date(stage.dueDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        status: stage.status
                    }))
                } : null,
                termsAndConditions: proposal.termsAndConditions,
                calculateTotalPrice: formatCurrency(totalAmount),
                currentYear: new Date().getFullYear(),
                customerPortalUrl: customerPortalUrl
            },
            attachments: [{
                content: pdfBuffer.toString('base64'),
                name: `proposal-${proposal.id}.pdf`,
                type: 'application/pdf'
            }]
        });

        // Increment the sent email count
        const updatedProposal = await prisma.weddingProposal.update({
            where: { id },
            data: {
                sentEmailCount: {
                    increment: 1
                },
                lastEmailSentAt: new Date()
            }
        });

        responseHandler(res, 200, 'Wedding proposal email sent successfully', {
            sentEmailCount: updatedProposal.sentEmailCount,
            lastEmailSentAt: updatedProposal.lastEmailSentAt
        });
    } catch (error) {
        console.error("Error sending proposal email:", error);
        handleError(res, error as Error);
    }
};