import { Request, Response } from "express";
import prisma from "../prisma";
import { responseHandler } from "../utils/helper";
import Stripe from "stripe";
import puppeteer from 'puppeteer';
import dotenv from "dotenv";
import Handlebars from 'handlebars';
import NodeCache from 'node-cache';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// Initialize cache with 24 hours TTL (in seconds)
const pdfCache = new NodeCache({ stdTTL: 24 * 60 * 60 });

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Handlebars.registerHelper('subtract', function(a, b) {
    return Number(a) - Number(b);
});

Handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
});

export const sessionController = async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        responseHandler(res, 400, "Session ID is required");
        return;
    }

    const session = await prisma.paymentIntent.findUnique({
        where: { stripeSessionId: sessionId },
        include: {
            bookings: {
                select: {
                    id: true
                }
            }
        }
    });

    if (!session) {
        responseHandler(res, 404, "Session not found");
        return;
    }

    if (session.status === "PENDING") {
        responseHandler(res, 200, "Session is pending");
        return;
    }

    if (session.status === "FAILED") {
        responseHandler(res, 400, "Session failed");
        return;
    }

    let sessionDetails;
    let receiptData = null;

    try {
        sessionDetails = await stripe.checkout.sessions.retrieve(sessionId);

        receiptData = {
            pdfDownloadUrl: `${process.env.NODE_ENV === "local" ? process.env.BASE_URL_DEV : process.env.BASE_URL_PROD}/sessions/${sessionId}/receipt`,
        };

    } catch (stripeError: any) {
        console.error("Stripe Error:", stripeError);
        const message = stripeError?.message || "Failed to retrieve session from Stripe";
        responseHandler(res, 500, message);
        return;
    }

    if (!sessionDetails) {
        responseHandler(res, 400, "Session details not found");
        return;
    }

    responseHandler(res, 200, "Session is successful", {
        success: true,
        sessionDetails: sessionDetails,
        receipt: receiptData,
        data: session
    });
};

// Helper function to generate PDF
async function generatePDF(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
        }
    });
    
    await browser.close();
    return Buffer.from(pdfBuffer);
}

export const generateReceiptPDF = async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        responseHandler(res, 400, "Session ID is required");
        return;
    }

    try {
        // Check if PDF exists in cache
        const cachedPDF = pdfCache.get<Buffer>(sessionId);
        if (cachedPDF) {
            console.log(`Serving cached PDF for session: ${sessionId}`);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=receipt-${sessionId}.pdf`);
            res.send(cachedPDF);
            return;
        }

        // Get session and charge details from Stripe
        const sessionDetails = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntent = await stripe.paymentIntents.retrieve(
            sessionDetails.payment_intent as string
        );
        const charge = await stripe.charges.retrieve(
            paymentIntent.latest_charge as string
        );

        // Get payment intent details from our database
        const dbPaymentIntent = await prisma.paymentIntent.findUnique({
            where: {
                stripeSessionId: sessionId
            },
            include: {
                bookings: {
                    select: { id: true }
                }
            }
        });

        if (!dbPaymentIntent) {
            throw new Error('Payment intent not found in database');
        }

        // Parse booking and customer data
        const bookingData = JSON.parse(dbPaymentIntent.bookingData);
        const customerData = JSON.parse(dbPaymentIntent.customerData);

        // Get all booking IDs from the PaymentIntent
        const bookingIds = dbPaymentIntent.bookings.map(b => b.id);

        // Initialize totals
        let totalAmount = 0;
        let totalEnhancements = 0;
        let totalRoomCharges = 0;
        let enhancementDetails: any[] = [];

        // Process each booking's details and merge with booking IDs
        const processedBookings = bookingData.map((booking: any, index: number) => {
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            
            // Calculate room total
            const roomTotal = booking.roomDetails.price * nights;
            totalRoomCharges += roomTotal;

            // Process enhancements for this room
            let roomEnhancements = 0;
            const roomEnhancementDetails = booking.selectedEnhancements?.map((enhancement: any) => {
                let enhancementPrice = enhancement.price;
                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

                // Calculate price based on pricing type
                switch (enhancement.pricingType) {
                    case 'PER_GUEST':
                        enhancementPrice = enhancement.price * booking.adults;
                        break;
                    case 'PER_BOOKING':
                        enhancementPrice = enhancement.price;
                        break;
                    case 'PER_DAY':
                        enhancementPrice = enhancement.price * nights;
                        break;
                    default:
                        enhancementPrice = enhancement.price;
                }

                roomEnhancements += enhancementPrice;
                totalEnhancements += enhancementPrice;
                enhancementDetails.push({
                    ...enhancement,
                    roomName: booking.roomDetails.name,
                    calculatedPrice: enhancementPrice,
                    pricingDetails: {
                        basePrice: enhancement.price,
                        pricingType: enhancement.pricingType,
                        nights: enhancement.pricingType === 'PER_DAY' ? nights : null,
                        guests: enhancement.pricingType === 'PER_GUEST' ? booking.adults : null
                    }
                });
                return {
                    ...enhancement,
                    calculatedPrice: enhancementPrice,
                    pricingDetails: {
                        basePrice: enhancement.price,
                        pricingType: enhancement.pricingType,
                        nights: enhancement.pricingType === 'PER_DAY' ? nights : null,
                        guests: enhancement.pricingType === 'PER_GUEST' ? booking.adults : null
                    }
                };
            }) || [];

            // Add to total amount
            totalAmount += roomTotal + roomEnhancements;

            return {
                id: bookingIds[index], // Merge booking ID
                room: {
                    name: booking.roomDetails.name,
                    description: booking.roomDetails.description,
                    price: booking.roomDetails.price,
                    amenities: booking.roomDetails.amenities || [],
                    capacity: booking.roomDetails.capacity
                },
                checkIn: checkIn.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                checkOut: checkOut.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                nights: nights,
                totalGuests: booking.adults,
                basePrice: booking.roomDetails.price,
                roomTotal: roomTotal,
                enhancements: roomEnhancementDetails,
                enhancementsTotal: roomEnhancements,
                rateOption: booking.selectedRateOption,
                request: booking.specialRequests || null,
                // Add raw dates for comparison
                rawCheckIn: checkIn,
                rawCheckOut: checkOut
            };
        });

        // Find earliest check-in and latest check-out only if all dates are the same
        const allSameCheckIn = processedBookings.every((b: { rawCheckIn: Date }) => 
            b.rawCheckIn.getTime() === processedBookings[0].rawCheckIn.getTime()
        );
        const allSameCheckOut = processedBookings.every((b: { rawCheckOut: Date }) => 
            b.rawCheckOut.getTime() === processedBookings[0].rawCheckOut.getTime()
        );

        // Get receipt template from database
        const template = await prisma.emailTemplate.findFirst({
            where: {
                type: 'RECEIPT',
                isActive: true,
            },
            orderBy: {
                version: 'desc',
            },
        });

        if (!template) {
            throw new Error('No active receipt template found');
        }

        // Compile the template with Handlebars
        const compiledTemplate = Handlebars.compile(template.html);
        
        // Calculate total guests across all rooms
        const totalGuests = processedBookings.reduce((sum: number, booking: { totalGuests: number }) => sum + booking.totalGuests, 0);

        // Prepare template data with detailed breakdowns
        const templateData = {
            receiptNumber: charge.receipt_number || sessionId,
            transactionId: charge.id,
            created: new Date(charge.created * 1000).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            customerName: `${customerData.firstName} ${customerData.middleName || ''} ${customerData.lastName}`.trim(),
            customerEmail: customerData.email,
            customerPhone: customerData.phone || 'N/A',
            customerNationality: customerData.nationality || 'N/A',
            paymentMethod: charge.payment_method_details?.type || 'Card',
            cardBrand: charge.payment_method_details?.card?.brand || '',
            cardLast4: charge.payment_method_details?.card?.last4 || '',
            amount: dbPaymentIntent.totalAmount.toFixed(2),
            subtotal: totalRoomCharges.toFixed(2),
            roomCharges: totalRoomCharges.toFixed(2),
            enhancementsTotal: totalEnhancements.toFixed(2),
            taxAmount: dbPaymentIntent.taxAmount.toFixed(2),
            currency: dbPaymentIntent.currency.toUpperCase(),
            status: dbPaymentIntent.status,
            totalRooms: bookingData.length,
            totalGuests: totalGuests,
            // Only show common check-in/out if all dates are the same
            showCommonDates: allSameCheckIn && allSameCheckOut,
            checkInDate: allSameCheckIn ? processedBookings[0].checkIn : null,
            checkOutDate: allSameCheckOut ? processedBookings[0].checkOut : null,
            bookings: processedBookings,
            enhancementDetails: enhancementDetails,
            specialRequests: customerData.specialRequests || 'None',
            paidAt: dbPaymentIntent.paidAt ? new Date(dbPaymentIntent.paidAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        // Generate HTML content using the compiled template
        const htmlContent = compiledTemplate(templateData);

        // Generate PDF
        const pdf = await generatePDF(htmlContent);

        // Store in cache
        pdfCache.set(sessionId, pdf);
        console.log(`Cached PDF for session: ${sessionId}`);

        // Send response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${charge.receipt_number || sessionId}.pdf`);
        res.send(pdf);

    } catch (error: any) {
        console.error("Error generating PDF:", error);
        responseHandler(res, 500, "Failed to generate PDF receipt");
    }
};

// Add a function to clear cache if needed
export const clearPDFCache = (sessionId?: string) => {
    if (sessionId) {
        pdfCache.del(sessionId);
    } else {
        pdfCache.flushAll();
    }
};
