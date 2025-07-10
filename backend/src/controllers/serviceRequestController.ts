import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';
import { EmailService } from '../services/emailService';
import { adminDashboardUrl, weddingPortalVendorSectionUrl } from '../utils/constants';

export const createServiceRequest = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { title, description, itineraryDayId, images } = req.body;
    // @ts-ignore
    const customerId = req.user.id;

    if (!title || !description) {
      responseHandler(res, 400, 'Title and description are required');
      return;
    }

    const proposal = await prisma.weddingProposal.findUnique({
        where: { id: proposalId },
        select: { 
          customerId: true,
          customer: {
            select: {
              guestEmail: true,
              guestFirstName: true,
              guestLastName: true
            }
          }
        }
    });

    if (!proposal || proposal.customerId !== customerId) {
        responseHandler(res, 404, 'Proposal not found or access denied');
        return;
    }

    // Create the service request
    const newRequest = await prisma.weddingServiceRequest.create({
      data: {
        title,
        description,
        proposalId,
        itineraryDayId,
      },
      include: { 
        messages: true,
      }
    });

    // If images were provided, create an initial message with the attachments
    if ((images && images.length > 0) || description) {
      await prisma.weddingServiceMessage.create({
        data: {
          text: description,
          requestId: newRequest.id,
          sender: 'GUEST',
          attachments: {
            create: images?.map((image: { url: string, fileName: string, fileType: string, fileSize: number }) => ({
              url: image.url,
              fileName: image.fileName,
              fileType: image.fileType,
              fileSize: image.fileSize,
            })) || [],
          }
        }
      });
    }

    // Send email notification to admin about new service request
    const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' }
    });

    // Send notification to all admin users
    for (const admin of adminUsers) {
        await EmailService.sendEmail({
            to: { email: admin.email, name: admin.name },
            templateType: 'NEW_SERVICE_REQUEST',
            templateData: {
                adminName: admin.name,
                customerName: `${proposal.customer.guestFirstName} ${proposal.customer.guestLastName}`,
                requestTitle: title,
                requestDescription: description,
                adminDashboardUrl
            }
        });
    }

    responseHandler(res, 201, 'Service request created successfully', newRequest);
  } catch (error: any) {
    handleError(res, error);
  }
};

export const getServiceRequestsForProposal = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    
    // For customer requests, verify ownership
    // @ts-ignore
    if (req.user.role === 'CUSTOMER') {
      // @ts-ignore
      const customerId = req.user.id;
      
      const proposal = await prisma.weddingProposal.findUnique({
        where: { id: proposalId },
        select: { customerId: true }
      });

      if (!proposal || proposal.customerId !== customerId) {
        responseHandler(res, 404, 'Proposal not found or access denied');
        return;
      }
    }

    const requests = await prisma.weddingServiceRequest.findMany({
      where: { proposalId },
      include: {
        messages: {
          include: {
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    responseHandler(res, 200, 'Service requests retrieved successfully', requests);
  } catch (error: any) {
    handleError(res, error);
  }
};

export const getServiceRequestById = async (req: Request, res: Response) => {
  try {
    const { requestId, proposalId } = req.params;
    
    // For customer requests, verify ownership
    // @ts-ignore
    if (req.user.role === 'CUSTOMER') {
      // @ts-ignore
      const customerId = req.user.id;
      
      const proposal = await prisma.weddingProposal.findUnique({
        where: { id: proposalId },
        select: { customerId: true }
      });

      if (!proposal || proposal.customerId !== customerId) {
        responseHandler(res, 404, 'Proposal not found or access denied');
        return;
      }
    }

    const request = await prisma.weddingServiceRequest.findUnique({
      where: { id: requestId },
      include: {
        messages: {
          include: {
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      responseHandler(res, 404, 'Service request not found');
      return;
    }

    responseHandler(res, 200, 'Service request retrieved successfully', request);
  } catch (error: any) {
    handleError(res, error);
  }
};

export const addServiceRequestMessage = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const { text, sender, attachments } = req.body;

        if (!text && (!attachments || attachments.length === 0)) {
            responseHandler(res, 400, 'Message text or attachments are required');
            return;
        }

        // Verify the request exists
        const request = await prisma.weddingServiceRequest.findUnique({
            where: { id: requestId },
            include: { 
              proposal: { 
                select: { 
                  customerId: true,
                  customer: {
                    select: {
                      guestEmail: true,
                      guestFirstName: true,
                      guestLastName: true
                    }
                  }
                } 
              } 
            }
        });

        if (!request) {
            responseHandler(res, 404, 'Service request not found');
            return;
        }

        // For customer messages, verify ownership
        // @ts-ignore
        if (sender === 'GUEST' && req.user.role === 'CUSTOMER') {
            // @ts-ignore
            const customerId = req.user.id;
            
            if (request.proposal.customerId !== customerId) {
                responseHandler(res, 403, 'Access denied');
                return;
            }
        }

        const newMessage = await prisma.weddingServiceMessage.create({
            data: {
                requestId,
                text,
                sender,
                attachments: {
                    create: attachments || [], // attachments should be an array of { url, fileName, fileType, fileSize }
                },
            },
            include: {
                attachments: true
            }
        });

        // Send email notification based on who sent the message
        if (sender === 'GUEST') {
            // Notify admin about new message from guest
            const adminUsers = await prisma.user.findMany({
                where: { role: 'ADMIN' }
            });

            // Send email to all admin users
            for (const admin of adminUsers) {
                await EmailService.sendEmail({
                    to: { email: admin.email, name: admin.name },
                    templateType: 'NEW_SERVICE_REQUEST_MESSAGE',
                    templateData: {
                        adminName: admin.name,
                        customerName: `${request.proposal.customer.guestFirstName} ${request.proposal.customer.guestLastName}`,
                        requestTitle: request.title,
                        messageText: text || 'New attachment(s)',
                        adminDashboardUrl
                    }
                });
            }
        } else {
            // Notify customer about new message from admin
            await EmailService.sendEmail({
                to: { 
                    email: request.proposal.customer.guestEmail, 
                    name: `${request.proposal.customer.guestFirstName} ${request.proposal.customer.guestLastName}` 
                },
                templateType: 'SERVICE_REQUEST_ADMIN_REPLY',
                templateData: {
                    customerName: request.proposal.customer.guestFirstName,
                    requestTitle: request.title,
                    messageText: text || 'New attachment(s)',
                    portalUrl: weddingPortalVendorSectionUrl
                }
            });
        }

        responseHandler(res, 201, 'Message added successfully', newMessage);
    } catch (error: any) {
        handleError(res, error);
    }
}

export const updateServiceRequest = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const { status, price, guestCount } = req.body;

        const request = await prisma.weddingServiceRequest.findUnique({ 
            where: { id: requestId },
            include: { 
              proposal: { 
                select: { 
                  id: true,
                  customer: {
                    select: {
                      guestEmail: true,
                      guestFirstName: true,
                      guestLastName: true
                    }
                  }
                } 
              } 
            }
        });

        if (!request) {
            responseHandler(res, 404, 'Service request not found');
            return;
        }

        const updatedRequest = await prisma.weddingServiceRequest.update({
            where: { id: requestId },
            data: {
                status,
                price,
                guestCount,
            },
        });

        // If status is updated to QUOTED, send notification to customer
        if (status === 'QUOTED' && price) {
            await EmailService.sendEmail({
                to: { 
                    email: request.proposal.customer.guestEmail, 
                    name: `${request.proposal.customer.guestFirstName} ${request.proposal.customer.guestLastName}` 
                },
                templateType: 'SERVICE_REQUEST_QUOTE',
                templateData: {
                    customerName: request.proposal.customer.guestFirstName,
                    requestTitle: request.title,
                    price: price.toFixed(2),
                    portalUrl: weddingPortalVendorSectionUrl
                }
            });
        }

        responseHandler(res, 200, 'Service request updated successfully', updatedRequest);
    } catch (error: any) {
        handleError(res, error);
    }
};

export const acceptServiceRequestQuote = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;

        const request = await prisma.weddingServiceRequest.findUnique({
            where: { id: requestId },
            include: {
                proposal: {
                    include: {
                        customer: true,
                        paymentPlan: {
                            include: {
                                stages: {
                                    orderBy: {
                                        dueDate: 'desc'
                                    }
                                }
                            }
                        },
                        itineraryDays: {
                            include: {
                                items: true
                            }
                        }
                    }
                },
                itineraryDay: true
            }
        });

        if (!request) {
            responseHandler(res, 404, 'Service request not found');
            return;
        }

        if (request.status !== 'QUOTED') {
            responseHandler(res, 400, 'Service request is not in QUOTED status');
            return;
        }

        if (!request.price) {
            responseHandler(res, 400, 'Service request does not have a price');
            return;
        }

        const updatedRequest = await prisma.$transaction(async (tx) => {
            // 1. Update the request status to ACCEPTED
            const acceptedRequest = await tx.weddingServiceRequest.update({
                where: { id: requestId },
                data: { status: 'ACCEPTED' },
            });

            // 2. Create a new product based on the service request
            const newProduct = await tx.product.create({
                data: {
                    name: request.title,
                    description: request.description,
                    price: request.price!,
                    pricingModel: request.guestCount ? 'PER_PERSON' : 'FIXED',
                    type: 'WEDDING',
                    category: 'CUSTOM_SERVICE',
                    isActive: true
                }
            });

            // 3. Add the product to the itinerary
            const itineraryDayId = request.itineraryDayId || request.proposal.itineraryDays[0]?.id;
            const guestCount = request.guestCount ||
                              (request.proposal.itineraryDays[0]?.items.length > 0 ?
                               request.proposal.itineraryDays[0].items[0].guestCount : 2);

            if (itineraryDayId) {
                await tx.itineraryItem.create({
                    data: {
                        dayId: itineraryDayId,
                        productId: newProduct.id,
                        guestCount: guestCount,
                        status: 'CONFIRMED',
                        price: request.price!,
                        notes: `Custom service: ${request.title}`
                    }
                });
            }

            // 4. Update the payment plan
            if (request.proposal.paymentPlan && request.price) {
                const paymentPlan = request.proposal.paymentPlan;

                await tx.paymentPlan.update({
                    where: { id: paymentPlan.id },
                    data: {
                        totalAmount: {
                            increment: request.price
                        }
                    }
                });

                const lastPendingStage = paymentPlan.stages.find(s => s.status === 'PENDING');

                if (lastPendingStage) {
                    await tx.paymentStage.update({
                        where: { id: lastPendingStage.id },
                        data: {
                            amount: {
                                increment: request.price
                            }
                        }
                    });
                } else {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
                    await tx.paymentStage.create({
                        data: {
                            paymentPlanId: paymentPlan.id,
                            description: `Payment for custom service: ${request.title}`,
                            amount: request.price,
                            dueDate,
                            status: 'PENDING'
                        }
                    });
                }
            } else {
                console.warn(`Service request ${request.id} accepted but no payment plan was found for proposal ${request.proposal.id}.`);
            }
            
            return acceptedRequest;
        });

        // 5. Send notifications
        const adminUsers = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });

        for (const admin of adminUsers) {
            await EmailService.sendEmail({
                to: { email: admin.email, name: admin.name },
                templateType: 'SERVICE_REQUEST_ACCEPTED',
                templateData: {
                    adminName: admin.name,
                    customerName: `${request.proposal.customer.guestFirstName} ${request.proposal.customer.guestLastName}`,
                    requestTitle: request.title,
                    price: request.price.toFixed(2),
                    adminDashboardUrl: adminDashboardUrl
                }
            });
        }
      
        responseHandler(res, 200, 'Quote accepted, added to itinerary and payment plan.', updatedRequest);
    } catch (error: any) {
        handleError(res, error);
    }
};

export const rejectServiceRequestQuote = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        // Find the service request and check if it's in QUOTED status
        const request = await prisma.weddingServiceRequest.findUnique({
            where: { id: requestId },
            include: { 
              proposal: { 
                select: { 
                  customerId: true,
                  id: true
                } 
              } 
            }
        });

        if (!request) {
            responseHandler(res, 404, 'Service request not found');
            return;
        }


        if (request.status !== 'QUOTED') {
            responseHandler(res, 400, 'Service request is not in QUOTED status');
            return;
        }

        // Update the request status to REJECTED
        const updatedRequest = await prisma.weddingServiceRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        });

        // Notify admin that the quote was rejected
        const adminUsers = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });

        // Send email to all admin users
        for (const admin of adminUsers) {
            await EmailService.sendEmail({
                to: { email: admin.email, name: admin.name },
                templateType: 'SERVICE_REQUEST_REJECTED',
                templateData: {
                    adminName: admin.name,
                    requestTitle: request.title,
                    adminDashboardUrl: adminDashboardUrl
                }
            });
        }

        responseHandler(res, 200, 'Quote rejected', updatedRequest);
    } catch (error: any) {
        handleError(res, error);
    }
}; 