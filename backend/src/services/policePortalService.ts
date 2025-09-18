import * as soap from 'soap';
import moment from 'moment';
import prisma from '../prisma';
import { EmailService } from './emailService';

// Validation Rules
export const VALIDATION_RULES = {
  name: {
    minLength: 1,
    maxLength: 30,
    allowedChars: /^[A-Za-zÀ-ÿ'\s]+$/,
    prohibitedChars: /[\d\-.,\/]/
  },
  surname: {
    minLength: 1,
    maxLength: 50,
    allowedChars: /^[A-Za-zÀ-ÿ'\s]+$/,
    prohibitedChars: /[\d\-.,\/]/
  },
  documentNumber: {
    minLength: 2,
    maxLength: 20,
    allowedChars: /^[A-Za-z0-9\s\-\.\/]+$/,
    prohibitedChars: /[#@!$%^&*()]/
  },
  arrivalDate: {
    format: 'DD/MM/YYYY',
    maxDaysInPast: 2,
    maxDaysInFuture: 0,
    acceptsFormat: ['DD/MM/YYYY', 'YYYY-MM-DD']
  },
  birthDate: {
    format: 'DD/MM/YYYY',
    minAge: 0,
    maxAge: 120,
    cannotBeFuture: true,
    acceptsFormat: ['DD/MM/YYYY', 'YYYY-MM-DD']
  },
  stayDuration: {
    min: 1,
    max: 30
  },
  gender: {
    validValues: ['1', '2'],
    mapping: { 'M': '1', 'F': '2', 'MALE': '1', 'FEMALE': '2' }
  }
};

// Error translations
export const ERROR_TRANSLATIONS: Record<string, string> = {
  'Nome non valido': 'First name is invalid',
  'Cognome non valido': 'Surname is invalid',
  'Nome con caratteri non validi': 'First name contains invalid characters',
  'Cognome con caratteri non validi': 'Surname contains invalid characters',
  'Tipo Documento non valido': 'Document type is invalid',
  'Tipo Documento Errato': 'Wrong document type code',
  'Numero Documento non valido': 'Document number is invalid',
  'Numero Documento con caratteri non validi': 'Document number contains invalid characters',
  'Data di Arrivo Errata': 'Arrival date is invalid (check date range)',
  'Data di Arrivo Non Valida': 'Arrival date format is invalid',
  'Data di Nascita Errata': 'Birth date is invalid',
  'Data di Nascita non valida': 'Birth date format is invalid',
  'Giorni di Permanenza Errati': 'Stay duration is invalid (must be 1-30 days)',
  'Sesso Errato': 'Gender is invalid (must be 1 or 2)',
  'Ospite con Capo Gruppo o Capo Famiglia Mancante': 'Group member requires group leader to be registered first',
  'SCHEDINA_FORMATO_NON_CORRETTO': 'Record format is incorrect',
  'SCHEDINA_CAMPO_NON_CORRETTO': 'Field value is incorrect',
  'Dimensione Riga errata': 'Record length is wrong',
  'ERRORE_PARAMETRO_ERRATO': 'Invalid parameter',
  'default': 'Validation error - please check all fields'
};
// Country codes for police portal
const COUNTRY_CODES: Record<string, string> = {
  'IT': '100000100', // Italy
  'US': '100000536', // United States
  'GB': '100000826', // United Kingdom
  'FR': '100000250', // France
  'DE': '100000276', // Germany
  'ES': '100000724', // Spain
  // Add more as needed
};

interface GuestData {
  tipo_alloggiato: string;
  data_arrivo: string;
  giorni_permanenza: number;
  cognome: string;
  nome: string;
  sesso: string;
  data_nascita: string;
  comune_nascita: string;
  provincia_nascita: string;
  stato_nascita: string;
  cittadinanza: string;
  tipo_documento: string;
  numero_documento: string;
  luogo_rilascio: string;
}


export class PolicePortalService {
  private config = {
    username: process.env.POLICE_PORTAL_USERNAME,
    password: process.env.POLICE_PORTAL_PASSWORD,
    wskey: process.env.POLICE_PORTAL_WSKEY,
    // Single WSDL URL for both test and production
    wsdlUrl: 'https://alloggiatiweb.poliziadistato.it/service/service.asmx?wsdl'
  };

  private client: soap.Client | null = null;
  private token: string | null = null;

  async initialize(): Promise<boolean> {
    try {
      this.client = await soap.createClientAsync(this.config.wsdlUrl);
      const args = {
        Utente: this.config.username,
        Password: this.config.password,
        WsKey: this.config.wskey
      };
      const [result]: any = await this.client.GenerateTokenAsync(args);
      
      console.log('Token generation response:', result);
      
      // Check if the operation was successful and we have a token
      if (result?.result?.esito === true && result?.GenerateTokenResult?.token) {
        this.token = result.GenerateTokenResult.token;
        console.log('Police Portal token generated successfully');
        return true;
      }
      
      console.error('Failed to generate token:', result);
      return false;
    } catch (error) {
      console.error('Failed to initialize Police Portal:', error);
      return false;
    }
  }

  private formatRecord(guest: GuestData): string {
    const pad = (str: string, len: number): string => {
      str = String(str || '');
      return str.padEnd(len, ' ').substring(0, len);
    };

    return (
      pad(guest.tipo_alloggiato, 2) +
      guest.data_arrivo +
      String(guest.giorni_permanenza).padStart(2, '0') +
      pad(guest.cognome, 50) +
      pad(guest.nome, 30) +
      guest.sesso +
      guest.data_nascita +
      pad(guest.comune_nascita, 9) +
      pad(guest.provincia_nascita, 2) +
      pad(guest.stato_nascita, 9) +
      pad(guest.cittadinanza, 9) +
      pad(guest.tipo_documento, 5) +
      pad(guest.numero_documento, 20) +
      pad(guest.luogo_rilascio, 9)
    );
  }

  validateGuest(guest: GuestData): { 
    isValid: boolean; 
    errors: Array<{ field: string; message: string }> 
  } {
    const errors: Array<{ field: string; message: string }> = [];
    
    // Name validation
    if (!guest.nome || guest.nome.trim().length === 0) {
      errors.push({ field: 'nome', message: 'First name is required' });
    } else if (VALIDATION_RULES.name.prohibitedChars.test(guest.nome)) {
      errors.push({ field: 'nome', message: 'First name cannot contain numbers or special characters' });
    }
    
    if (!guest.cognome || guest.cognome.trim().length === 0) {
      errors.push({ field: 'cognome', message: 'Surname is required' });
    } else if (VALIDATION_RULES.surname.prohibitedChars.test(guest.cognome)) {
      errors.push({ field: 'cognome', message: 'Surname cannot contain numbers or special characters' });
    }
    
    // Document validation for single guests
    if (['16', '17', '18'].includes(guest.tipo_alloggiato)) {
      if (!guest.tipo_documento) {
        errors.push({ field: 'tipo_documento', message: 'Document type is required for single guests' });
      }
      
      if (!guest.numero_documento || guest.numero_documento.length < 2) {
        errors.push({ field: 'numero_documento', message: 'Document number is required (min 2 characters)' });
      } else if (/[#@!$%^&*()]/.test(guest.numero_documento)) {
        errors.push({ field: 'numero_documento', message: 'Document number cannot contain special symbols' });
      }
    }
    
    // Date validation
    const arrivalDate = moment(guest.data_arrivo, 'DD/MM/YYYY');
    const today = moment();
    const twoDaysAgo = moment().subtract(2, 'days');
    
    if (!arrivalDate.isValid()) {
      errors.push({ field: 'data_arrivo', message: 'Arrival date must be in DD/MM/YYYY format' });
    } else if (arrivalDate.isAfter(today)) {
      errors.push({ field: 'data_arrivo', message: 'Arrival date cannot be in the future' });
    } else if (arrivalDate.isBefore(twoDaysAgo)) {
      errors.push({ field: 'data_arrivo', message: 'Can only report arrivals from the last 2 days' });
    }
    
    const birthDate = moment(guest.data_nascita, 'DD/MM/YYYY');
    if (!birthDate.isValid()) {
      errors.push({ field: 'data_nascita', message: 'Birth date must be in DD/MM/YYYY format' });
    } else if (birthDate.isAfter(today)) {
      errors.push({ field: 'data_nascita', message: 'Birth date cannot be in the future' });
    }
    
    // Stay duration
    if (guest.giorni_permanenza < 1 || guest.giorni_permanenza > 30) {
      errors.push({ field: 'giorni_permanenza', message: 'Stay duration must be between 1-30 days' });
    }
    
    // Gender
    if (!['1', '2'].includes(guest.sesso)) {
      errors.push({ field: 'sesso', message: 'Gender must be 1 (Male) or 2 (Female)' });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  translateError(italianError: string): string {
    for (const [italian, english] of Object.entries(ERROR_TRANSLATIONS)) {
      if (italianError.includes(italian)) {
        return english;
      }
    }
    return italianError;
  }

  private async prepareGuestData(booking: any): Promise<GuestData[]> {
    const guests: GuestData[] = [];
    const checkIn = moment(booking.checkIn);
    const checkOut = moment(booking.checkOut);
    const stayDuration = Math.min(checkOut.diff(checkIn, 'days'), 30);
    
    // Process all guests with check-in access
    if (booking.guestCheckInAccess && booking.guestCheckInAccess.length > 0) {
      for (let i = 0; i < booking.guestCheckInAccess.length; i++) {
        const guestAccess = booking.guestCheckInAccess[i];
        const customer = guestAccess.customer;
        
        // Determine guest type (16=single, 17=family head, 19=family member, 18=group head, 20=group member)
        let tipo_alloggiato = '16'; // Default to single
        if (booking.guestCheckInAccess.length > 1) {
          if (guestAccess.isMainGuest) {
            tipo_alloggiato = '17'; // Family head
          } else {
            tipo_alloggiato = '19'; // Family member
          }
        }
        
        // Map gender
        const gender = customer.gender === 'MALE' ? '1' : '2';
        
        // Choose document based on priority: Passport > ID Card
        let documentType = '';
        let documentNumber = '';
        
        if (customer.passportNumber && customer.passportNumber.trim()) {
          // Use passport if available
          documentType = 'PASOR';
          documentNumber = customer.passportNumber.trim();
        } else if (customer.idCard && customer.idCard.trim()) {
          // Use ID card if passport not available
          documentType = 'IDENT';
          documentNumber = customer.idCard.trim();
        } else {
          // Fallback - try using any available document field
          documentType = 'ALTRO';
          documentNumber = customer.idNumber || '';
        }
        
        // Get country code
        const countryCode = COUNTRY_CODES[customer.nationality] || '100000536'; // Default to US
        
        guests.push({
          tipo_alloggiato,
          data_arrivo: checkIn.format('DD/MM/YYYY'),
          giorni_permanenza: stayDuration,
          cognome: (customer.guestLastName || '').toUpperCase(),
          nome: (customer.guestFirstName || '').toUpperCase(),
          sesso: gender,
          data_nascita: moment(customer.dob).format('DD/MM/YYYY'),
          comune_nascita: '',
          provincia_nascita: '',
          stato_nascita: countryCode,
          cittadinanza: countryCode,
          tipo_documento: documentType,
          numero_documento: documentNumber,
          luogo_rilascio: countryCode
        });
      }
    }
    
    return guests;
  }

  async testReporting(guests: GuestData[]): Promise<{
    success: boolean;
    errors: Array<{ guest: number; error: string }>;
  }> {
    if (!this.token) {
      await this.initialize();
    }
    
    if (!this.client || !this.token) {
      return { success: false, errors: [{ guest: 0, error: 'Failed to initialize client' }] };
    }
    
    const records = guests.map(g => this.formatRecord(g));
    const args = {
      Utente: this.config.username,
      token: this.token,
      ElencoSchedine: {
        string: records
      }
    };
    
    try {
      const [result]: any = await this.client.TestAsync(args);
      
      if (result?.TestResult?.esito === true) {
        return { success: true, errors: [] };
      } else {
        const errors: Array<{ guest: number; error: string }> = [];
        
        if (result?.TestResult?.ErroreDes) {
          errors.push({ guest: 0, error: this.translateError(result.TestResult.ErroreDes) });
        }
        
        // Check individual record errors
        if (result?.TestResult?.Dettaglio?.EsitoOperazioneServizio) {
          const details = Array.isArray(result.TestResult.Dettaglio.EsitoOperazioneServizio)
            ? result.TestResult.Dettaglio.EsitoOperazioneServizio
            : [result.TestResult.Dettaglio.EsitoOperazioneServizio];
          
          details.forEach((detail: any, index: number) => {
            if (!detail.esito) {
              const error = this.translateError(detail.ErroreDes || detail.ErroreDettaglio || 'Unknown error');
              errors.push({ guest: index + 1, error });
            }
          });
        }
        
        return { success: false, errors };
      }
    } catch (error: any) {
      return { success: false, errors: [{ guest: 0, error: error.message }] };
    }
  }

  async sendToPolice(guests: GuestData[]): Promise<{
    success: boolean;
    errors: Array<{ guest: number; error: string }>;
  }> {
    if (!this.token) {
      await this.initialize();
    }
    
    if (!this.client || !this.token) {
      return { success: false, errors: [{ guest: 0, error: 'Failed to initialize client' }] };
    }
    
    const records = guests.map(g => this.formatRecord(g));
    const args = {
      Utente: this.config.username,
      token: this.token,
      ElencoSchedine: {
        string: records
      }
    };
    
    try {
      // Always validate first with TestAsync
      const [testResult]: any = await this.client.TestAsync(args);
      
      if (testResult?.TestResult?.esito !== true) {
        const errors: Array<{ guest: number; error: string }> = [];
        
        if (testResult?.TestResult?.ErroreDes) {
          errors.push({ guest: 0, error: this.translateError(testResult.TestResult.ErroreDes) });
        }
        
        // Check individual record errors
        if (testResult?.TestResult?.Dettaglio?.EsitoOperazioneServizio) {
          const details = Array.isArray(testResult.TestResult.Dettaglio.EsitoOperazioneServizio)
            ? testResult.TestResult.Dettaglio.EsitoOperazioneServizio
            : [testResult.TestResult.Dettaglio.EsitoOperazioneServizio];
          
          details.forEach((detail: any, index: number) => {
            if (!detail.esito) {
              const error = this.translateError(detail.ErroreDes || detail.ErroreDettaglio || 'Unknown error');
              errors.push({ guest: index + 1, error });
            }
          });
        }
        
        return { success: false, errors };
      }
      
      // If we're in test mode, stop here after validation
      const isTestMode = process.env.POLICE_PORTAL_TEST === 'true';
      if (isTestMode) {
        console.log('Police Portal in TEST mode - validation passed, not submitting to production');
        return { success: true, errors: [] };
      }
      
      // In production mode, submit with SendAsync after successful validation
      console.log('Police Portal in PRODUCTION mode - submitting to police database');
      const [sendResult]: any = await this.client.SendAsync(args);
      
      if (sendResult?.SendResult?.esito === true) {
        return { success: true, errors: [] };
      } else {
        const errors: Array<{ guest: number; error: string }> = [];
        
        if (sendResult?.SendResult?.ErroreDes) {
          errors.push({ guest: 0, error: this.translateError(sendResult.SendResult.ErroreDes) });
        }
        
        return { success: false, errors };
      }
    } catch (error: any) {
      return { success: false, errors: [{ guest: 0, error: error.message }] };
    }
  }

  async reportBooking(bookingId: string): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      // Get booking with all related data
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          room: true,
          guestCheckInAccess: {
            include: {
              customer: true
            }
          }
        }
      });
      
      if (!booking) {
        return { success: false, errors: ['Booking not found'] };
      }
      
      // Skip if already reported
      if (booking.reportedToPolice) {
        return { success: true, errors: [] };
      }
      
      // Skip if not checked in
      if (!booking.checkedInAt) {
        return { success: false, errors: ['Booking not checked in'] };
      }
      
      // Prepare guest data
      const guests = await this.prepareGuestData(booking);
      
      if (guests.length === 0) {
        return { success: false, errors: ['No guest data available'] };
      }
      
      // Validate all guests
      const validationErrors: string[] = [];
      for (let i = 0; i < guests.length; i++) {
        const validation = this.validateGuest(guests[i]);
        if (!validation.isValid) {
          validation.errors.forEach(err => {
            validationErrors.push(`Guest ${i + 1}: ${err.message}`);
          });
        }
      }
      
      if (validationErrors.length > 0) {
        // Update booking with error
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            policeReportError: validationErrors.join('; ')
          }
        });
        return { success: false, errors: validationErrors };
      }
      
      // Send to police portal
      const result = await this.sendToPolice(guests);
      
      if (result.success) {
        // Update booking as reported
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            reportedToPolice: true,
            policeReportedAt: new Date(),
            policeReportError: null
          }
        });
        return { success: true, errors: [] };
      } else {
        // Update booking with errors
        const errorMessages = result.errors.map(e => `Guest ${e.guest}: ${e.error}`);
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            policeReportError: errorMessages.join('; ')
          }
        });
        return { success: false, errors: errorMessages };
      }
    } catch (error: any) {
      console.error('Error reporting booking to police:', error);
      return { success: false, errors: [error.message] };
    }
  }

  async reportDailyBookings(): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ bookingId: string; errors: string[] }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookings = await prisma.booking.findMany({
      where: {
        checkedInAt: {
          gte: today,
          lt: tomorrow
        },
        reportedToPolice: false,  
        status: 'CONFIRMED'
      },
      include: {
        customer: true,
        room: true,
        guestCheckInAccess: {
          include: {
            customer: true
          }
        }
      }
    });
    
    const results = {
      total: bookings.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ bookingId: string; errors: string[] }>
    };
    
    const failedBookingDetails = [];
    
    for (const booking of bookings) {
      const result = await this.reportBooking(booking.id);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          bookingId: booking.id,
          errors: result.errors
        });
        
        // Collect details for admin notification
        failedBookingDetails.push({
          bookingId: booking.id,
          roomName: booking.room?.name || 'Unknown',
          guestName: booking.customer ? 
            `${booking.customer.guestFirstName} ${booking.customer.guestLastName}` : 
            'Unknown Guest',
          error: result.errors.join('; ')
        });
      }
    }
    
    // Send admin notification if there are failures
    if (results.failed > 0 && process.env.ADMIN_EMAIL) {
      try {
        await EmailService.sendEmail({
          to: {
            email: process.env.ADMIN_EMAIL,
            name: 'Admin'
          },
          templateType: 'POLICE_PORTAL_FAILURE',
          templateData: {
            reportDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            totalBookings: results.total,
            successfulReports: results.successful,
            failedReports: results.failed,
            failedBookings: failedBookingDetails
          }
        });
        
        console.log(`[PolicePortalService] Admin notification sent to ${process.env.ADMIN_EMAIL} for ${results.failed} failed reports`);
      } catch (emailError) {
        console.error('[PolicePortalService] Failed to send admin notification:', emailError);
      }
    }
    
    return results;
  }
}

export const policePortalService = new PolicePortalService();