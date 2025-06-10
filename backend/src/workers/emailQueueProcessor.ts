import { processEmailQueue } from '../routes/stripeWebhook';

const PROCESS_INTERVAL = 5000; // Process every 5 seconds

async function startEmailQueueProcessor() {
    console.log('Starting email queue processor...');
    
    while (true) {
        console.log('Processing email queue...');
        try {
            await processEmailQueue();
        } catch (error) {
            console.error('Error in email queue processor:', error);
        }
        
        // Wait before next processing
        await new Promise(resolve => setTimeout(resolve, PROCESS_INTERVAL));
    }
}

// Start the processor if this file is run directly
if (require.main === module) {
    startEmailQueueProcessor().catch(console.error);
}

export { startEmailQueueProcessor }; 