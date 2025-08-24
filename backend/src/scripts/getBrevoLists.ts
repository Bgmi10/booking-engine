import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function getBrevoLists() {
  try {
    const response = await axios.get('https://api.brevo.com/v3/contacts/lists', {
      headers: {
        'api-key': "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",
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Available Brevo Lists:');
    console.log('=====================');
    
    if (response.data.lists && response.data.lists.length > 0) {
      console.log(response.data.lists)
    } else {
      console.log('No lists found. Create a list in Brevo dashboard first.');
    }

  } catch (error: any) {
    console.error('Error fetching Brevo lists:', error.response?.data || error.message);
  }
}

// Run the script
getBrevoLists();