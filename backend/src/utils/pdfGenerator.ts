import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import NodeCache from 'node-cache';
import crypto from 'crypto';

// Create a cache for PDFs
export const pdfCache = new NodeCache({ stdTTL: 24 * 60 * 60 }); // Cache for 24 hours

// Register common Handlebars helpers
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

Handlebars.registerHelper('subtract', function(a, b) {
    return Number(a) - Number(b);
});

Handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
});

Handlebars.registerHelper('currentYear', function() {
    return new Date().getFullYear();
});

// Function to generate PDF from HTML content
export async function generatePDF(htmlContent: string): Promise<Buffer> {
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

// Helper to compile a template with Handlebars
export function compileTemplate(templateHtml: string, data: any): string {
    const compiledTemplate = Handlebars.compile(templateHtml);
    return compiledTemplate(data);
}

/**
 * Generate a hash from data to use as part of cache key
 * This ensures that when data changes, the cache key changes
 */
export function generateDataHash(data: any): string {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(stringData).digest('hex');
}

/**
 * Get a cache key that includes the ID and a hash of the data
 * This ensures the PDF is regenerated when data changes
 */
export function getCacheKey(id: string, data: any): string {
    const dataHash = generateDataHash(data);
    return `${id}_${dataHash}`;
}

/**
 * Fetch PDF from cache if available with matching data hash, otherwise generate it
 * @param id Base identifier for the PDF (e.g. proposal ID)
 * @param data Data used for the PDF that affects content
 * @param generateFn Function to generate the PDF if not in cache
 * @returns Buffer containing the PDF
 */
export async function getOrGeneratePDF(
    id: string, 
    data: any, 
    generateFn: () => Promise<Buffer>
): Promise<Buffer> {
    const cacheKey = getCacheKey(id, data);
    
    // Check if PDF exists in cache with matching data hash
    const cachedPDF = pdfCache.get<Buffer>(cacheKey);
    if (cachedPDF) {
        console.log(`Serving cached PDF for key: ${cacheKey}`);
        return cachedPDF;
    }
    
    // Generate new PDF
    console.log(`Generating new PDF for key: ${cacheKey}`);
    const pdf = await generateFn();
    
    // Store in cache with data hash in the key
    pdfCache.set(cacheKey, pdf);
    
    return pdf;
} 