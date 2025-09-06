// testAlloggiati.ts
import * as soap from 'soap';
import moment from 'moment';
import * as fs from 'fs';

interface AlloggiatiConfig {
  username: string;
  password: string;
  wskey: string;
  wsdlUrl: string;
}

interface TestGuest {
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

class AlloggiatiTester {
  private config: AlloggiatiConfig;
  private client: soap.Client | null = null;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      username: 'FI019802', // Replace with your actual username
      password: 'LaTorre2025!', // Replace with your actual password
      wskey: 'AGd3FdKMCNYawSpHyduwYLFmd2DdKzUrP5PKhvbNRFDbEvi7yaWQAiyzkbEZEc5PCg==',
      wsdlUrl: 'https://alloggiatiweb.poliziadistato.it/service/service.asmx?wsdl'
    };
  }

  private log(message: string, data?: any): void {
    //@ts-ignore
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async initialize(): Promise<boolean> {
    try {
      this.log('Initializing SOAP client...');
      this.client = await soap.createClientAsync(this.config.wsdlUrl);
      this.log('✓ SOAP client initialized successfully');
      
      // Log available methods
      const methods = Object.keys(this.client.describe());
      this.log('Available methods:', methods);
      
      return true;
    } catch (error: any) {
      this.log('✗ Failed to initialize SOAP client', error.message);
      return false;
    }
  }

  async testGenerateToken(): Promise<boolean> {
    if (!this.client) {
      this.log('✗ Client not initialized');
      return false;
    }

    try {
      this.log('Testing GenerateToken...');
      
      const args = {
        Utente: this.config.username,
        Password: this.config.password,
        WsKey: this.config.wskey
      };

      this.log('Request parameters:', {
        Utente: args.Utente,
        Password: '***hidden***',
        WsKey: args.WsKey.substring(0, 20) + '...'
      });

      const [result, rawResponse, soapHeader, rawRequest]: any = await this.client.GenerateTokenAsync(args);
      
      // Log raw XML for debugging (optional)
      if (process.env.DEBUG === 'true') {
        fs.writeFileSync('request.xml', rawRequest);
        fs.writeFileSync('response.xml', rawResponse);
        this.log('Raw XML saved to request.xml and response.xml');
      }

      if (result?.result?.esito === true) {
        this.token = result.GenerateTokenResult.token;
        this.tokenExpiry = new Date(result.GenerateTokenResult.expires);
        
        this.log('✓ Token generated successfully', {
            //@ts-ignore
          tokenLength: this.token.length,
          expiresAt: this.tokenExpiry.toISOString(),
          validForMinutes: Math.round((this.tokenExpiry.getTime() - Date.now()) / 60000)
        });
        
        return true;
      } else {
        this.log('✗ Token generation failed', {
          errorCode: result?.result?.ErroreCod,
          errorDescription: result?.result?.ErroreDes,
          errorDetail: result?.result?.ErroreDettaglio
        });
        return false;
      }
    } catch (error: any) {
      this.log('✗ Error calling GenerateToken', {
        error: error.message,
        code: error.code,
        body: error.body
      });
      return false;
    }
  }

  async testAuthenticationTest(): Promise<boolean> {
    if (!this.client || !this.token) {
      this.log('✗ Client not initialized or no token');
      return false;
    }

    try {
      this.log('Testing Authentication_Test...');
      
      const args = {
        Utente: this.config.username,
        token: this.token
      };

      const [result]: any = await this.client.Authentication_TestAsync(args);
      
      if (result?.Authentication_TestResult?.esito === true) {
        this.log('✓ Authentication test passed');
        return true;
      } else {
        this.log('✗ Authentication test failed', result?.Authentication_TestResult);
        return false;
      }
    } catch (error: any) {
      this.log('✗ Error calling Authentication_Test', error.message);
      return false;
    }
  }

  private formatGuestRecord(guest: TestGuest): string {
    const pad = (str: string, len: number): string => {
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

  async testRecordValidation(): Promise<boolean> {
    if (!this.client || !this.token) {
      this.log('✗ Client not initialized or no token');
      return false;
    }

    try {
      this.log('Testing record validation...');
      
      // Create test guest record
      const testGuest: TestGuest = {
        tipo_alloggiato: '16',  // Single guest
        //@ts-ignore
        data_arrivo: moment().subtract(1, 'day').format('DD/MM/YYYY'),
        giorni_permanenza: 2,
        cognome: 'TEST',
        nome: 'GUEST',
        sesso: '1',  // Male
        data_nascita: '01/01/1990',
        comune_nascita: '400419000',  // Foreign
        provincia_nascita: '  ',
        stato_nascita: '400419000',  // USA code (example)
        cittadinanza: '400419000',
        tipo_documento: 'PASOR',  // Passport
        numero_documento: 'TEST123456',
        luogo_rilascio: '400419000'
      };

      const record = this.formatGuestRecord(testGuest);
      this.log('Formatted record length:', record.length);
      this.log('Record preview:', record.substring(0, 50) + '...');

      const args = {
        Utente: this.config.username,
        token: this.token,
        ElencoSchedine: [record]
      };

      const [result]: any = await this.client.TestAsync(args);
      
      if (result?.TestResult?.esito === true) {
        this.log('✓ Record validation passed', {
          validRecords: result.result?.SchedineValide
        });
        return true;
      } else {
        this.log('✗ Record validation failed');
        
        // Log detailed errors
        if (result?.result?.Dettaglio) {
          result.result.Dettaglio.forEach((detail: any, index: number) => {
            if (!detail.esito) {
              this.log(`  Record ${index + 1} error:`, {
                code: detail.ErroreCod,
                description: detail.ErroreDes,
                detail: detail.ErroreDettaglio
              });
            }
          });
        }
        return false;
      }
    } catch (error: any) {
      this.log('✗ Error calling Test', error.message);
      return false;
    }
  }

  async testDownloadTables(): Promise<boolean> {
    if (!this.client || !this.token) {
      this.log('✗ Client not initialized or no token');
      return false;
    }

    try {
      this.log('Testing table download...');
      
      // Try to download document types table
      const args = {
        Utente: this.config.username,
        token: this.token,
        tipo: 'Tipi_Documento'  // Document types table
      };

      const [result]: any = await this.client.TabellaAsync(args);
      
      if (result?.TabellaResult?.esito === true) {
        const csv = result.CSV;
        this.log('✓ Table downloaded successfully');
        
        // Parse and display first few rows
        const rows = csv.split('\n').slice(0, 5);
        this.log('First 5 rows:', rows);
        
        // Save to file for reference
        fs.writeFileSync('document_types.csv', csv);
        this.log('Table saved to document_types.csv');
        
        return true;
      } else {
        this.log('✗ Table download failed', result?.TabellaResult);
        return false;
      }
    } catch (error: any) {
      this.log('✗ Error downloading table', error.message);
      return false;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('=====================================');
    console.log('    ALLOGGIATI WEB SERVICE TEST     ');
    console.log('=====================================\n');

    let allTestsPassed = true;

    // Test 1: Initialize client
    if (!await this.initialize()) {
      this.log('❌ Cannot proceed without client initialization');
      return;
    }

    // Test 2: Generate token
    if (!await this.testGenerateToken()) {
      this.log('❌ Cannot proceed without valid token');
      return;
    }

    // Test 3: Verify authentication
    if (!await this.testAuthenticationTest()) {
      allTestsPassed = false;
    }

    // Test 4: Validate record format
    if (!await this.testRecordValidation()) {
      allTestsPassed = false;
    }

    // Test 5: Download reference tables
    if (!await this.testDownloadTables()) {
      allTestsPassed = false;
    }

    console.log('\n=====================================');
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - Web service is working!');
      console.log('You can proceed with full implementation.');
    } else {
      console.log('⚠️ SOME TESTS FAILED - Check the logs above');
      console.log('Fix the issues before proceeding.');
    }
    console.log('=====================================');
  }
}

// Run the tests
async function main() {
  const tester = new AlloggiatiTester();
  await tester.runAllTests();
}

main().catch(console.error);