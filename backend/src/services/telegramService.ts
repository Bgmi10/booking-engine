import axios from 'axios';
import prisma from '../prisma';
import { telegramConfig } from '../config/telegramConfig';

type StaffRole = 'KITCHEN' | 'WAITER' | 'ADMIN' | 'MANAGER';

class TelegramService {
  private frontendBaseUrl: string;

  constructor() {
    this.frontendBaseUrl = telegramConfig.frontendBaseUrl as string;
  }

  /**
   * Get the bot token from config
   */
  private getBotToken(): string {
    return telegramConfig.botToken as string;
  }

  /**
   * Sends a message to Telegram channel
   * @param message The message to send
   * @returns Promise that resolves when message is sent or rejected on error
   */
  private async sendTelegramMessage(message: string, replyMarkup?: any): Promise<boolean> {
    const telegramBotToken = this.getBotToken();
    
    if (!telegramBotToken) {
      console.log('Skipping Telegram notification: No bot token configured');
      return false;
    }

    try {
      // Get the Telegram channel ID from config
      const channelId = telegramConfig.mainChannelId;
      
      if (!channelId) {
        console.error('Main channel ID not configured. Cannot send notification.');
        return false;
      }

      console.log(`Sending message to channel ${channelId} with token ${telegramBotToken.substring(0, 5)}...`);

      // Send message to the Telegram channel
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: channelId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
      
      if (response.status === 200 && response.data?.ok) {
        console.log('Telegram notification sent successfully');
        return true;
      } else {
        console.error('Telegram API returned error:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      return false;
    }
  }

  /**
   * Sends a message to a specific role channel
   * @param role The staff role to notify
   * @param message The message to send
   * @returns Promise that resolves when message is sent or rejected on error
   */
  private async sendRoleMessage(role: StaffRole, message: string, replyMarkup?: any): Promise<boolean> {
    const telegramBotToken = this.getBotToken();
    
    // Get the channel ID for the specific role
    let channelId: string | undefined;
    
    if (role === 'KITCHEN') {
      channelId = telegramConfig.kitchenChannelId;
    } else if (role === 'WAITER') {
      channelId = telegramConfig.waiterChannelId;
    }
    
    if (!channelId) {
      console.log(`No Telegram channel configured for role ${role}. Falling back to main channel.`);
      return this.sendTelegramMessage(message, replyMarkup);
    }

    if (!telegramBotToken) {
      console.log('Skipping Telegram notification: No bot token configured');
      return false;
    }

    try {
      console.log(`Sending message to ${role} channel ${channelId} with token ${telegramBotToken.substring(0, 5)}...`);
      
      // Send message to the role-specific Telegram channel
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: channelId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      }, {
        timeout: 10000 // 10 second timeout
      });
      
      if (response.status === 200 && response.data?.ok) {
        console.log(`Telegram notification sent to ${role} channel`);
        return true;
      } else {
        console.error(`Telegram API returned error for ${role} channel:`, response.data);
        return false;
      }
    } catch (error) {
      console.error(`Error sending Telegram notification to ${role} channel:`, error);
      // If there's a specific error with the role channel, try the main channel as backup
      console.log(`Attempting to send to main channel as fallback...`);
      return this.sendTelegramMessage(message, replyMarkup);
    }
  }

  /**
   * Notifies relevant staff about a newly created order.
   * @param orderId The ID of the order.
   * @param orderDetails Additional details for the message.
   * @returns Promise that resolves when notification is sent
   */
  async notifyNewOrder(orderId: string, orderDetails: { 
    total: number, 
    locationName: string,
    hasKitchenItems?: boolean,
    hasWaiterItems?: boolean,
    paymentMethod?: string,
    itemCount?: number
  }): Promise<boolean> {
    try {
      const kitchenUrl = `${this.frontendBaseUrl}/admin/dashboard?sidebar=kitchen-orders`;
      let message = `🔔 <b>New Order (#${orderId.substring(0, 6)})</b>\n\n`;
      message += `Amount: $${orderDetails.total.toFixed(2)}\n`;
      message += `Location: ${orderDetails.locationName}\n`;
      
      if (orderDetails.itemCount) {
        message += `Items: ${orderDetails.itemCount}\n`;
      }
      
      if (orderDetails.hasWaiterItems) {
        message += `<i>Note: This order also has items for waiters</i>\n`;
      }
      
      const replyMarkup = {
        inline_keyboard: [[{ text: 'View Kitchen Orders', url: kitchenUrl }]]
      };
      
      // Send to the KITCHEN role channel
      return await this.sendRoleMessage('KITCHEN', message, replyMarkup);
    } catch (error) {
      console.error('Failed to send new order notification:', error);
      return false;
    }
  }

  /**
   * Notifies waiters about an order with waiter items.
   * @param orderId The ID of the order.
   * @param orderDetails Additional details for the message.
   * @returns Promise that resolves when notification is sent
   */
  async notifyWaiterOrder(orderId: string, orderDetails: {
    total: number,
    locationName: string,
    hasKitchenItems?: boolean,
    paymentMethod?: string,
    itemCount?: number
  }): Promise<boolean> {
    try {
      const waiterUrl = `${this.frontendBaseUrl}/admin/dashboard?sidebar=waiter-orders`;
      let message = `🔔 <b>New Waiter Order (#${orderId.substring(0, 6)})</b>\n\n`;
      message += `Amount: $${orderDetails.total.toFixed(2)}\n`;
      message += `Location: ${orderDetails.locationName}\n`;
      
      if (orderDetails.itemCount) {
        message += `Items: ${orderDetails.itemCount}\n`;
      }
      
      // Add payment method information for waiters
      if (orderDetails.paymentMethod === 'ASSIGN_TO_ROOM') {
        message += `Payment: <b>Assigned to Room</b>\n`;
      } else {
        message += `Payment: <b>Pay at Waiter</b>\n`;
      }
      
      if (orderDetails.hasKitchenItems) {
        message += `<i>Note: This order also has items for kitchen</i>\n`;
      }
      
      const replyMarkup = {
        inline_keyboard: [[{ text: 'View Waiter Orders', url: waiterUrl }]]
      };
      
      // Send to the WAITER role channel
      return await this.sendRoleMessage('WAITER', message, replyMarkup);
    } catch (error) {
      console.error('Failed to send waiter order notification:', error);
      return false;
    }
  }

  /**
   * Notifies relevant staff that an order is ready for pickup.
   * @param orderId The ID of the order.
   * @returns Promise that resolves when notification is sent
   */
  async notifyOrderReadyForPickup(orderId: string): Promise<boolean> {
    try {
      const waiterUrl = `${this.frontendBaseUrl}/admin/dashboard?sidebar=waiter-orders`;
      const message = `🚀 <b>Order Ready (#${orderId.substring(0, 6)})</b>\n\nThis order is ready for delivery!`;
      
      const replyMarkup = {
        inline_keyboard: [[{ text: 'View Waiter Orders', url: waiterUrl }]]
      };
      
      // Send to the WAITER role channel
      return await this.sendRoleMessage('WAITER', message, replyMarkup);
    } catch (error) {
      console.error('Failed to send order ready notification:', error);
      return false;
    }
  }

  /**
   * Notifies all staff that an order has been cancelled.
   * @param orderId The ID of the order.
   * @returns Promise that resolves when notification is sent
   */
  async notifyOrderCancelled(orderId: string): Promise<boolean> {
    try {
      const message = `❌ <b>Order Cancelled (#${orderId.substring(0, 6)})</b>\n\nThis order has been cancelled.`;
      
      // Send to all staff channels
      return await this.sendTelegramMessage(message);
    } catch (error) {
      console.error('Failed to send order cancelled notification:', error);
      return false;
    }
  }

  /**
   * Setup instructions for creating the Telegram bot and channels
   */
  static getSetupInstructions(): string {
    return `
# Telegram Notification Setup

## Step 1: Create a Telegram Bot
1. Open Telegram and search for BotFather (@BotFather)
2. Send /newbot to create a new bot
3. Follow the instructions to choose a name and username
4. Copy the API token provided by BotFather

## Step 2: Create Telegram Channels
1. Create a main channel for all notifications
2. Create role-specific channels (e.g., kitchen-orders, waiter-orders)
3. Add your bot as an administrator to each channel
4. Make channels public temporarily to get their @username

## Step 3: Configure Environment Variables
Add these to your .env file:
\`\`\`
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHANNEL_ID=@your_main_channel_username
TELEGRAM_KITCHEN_CHANNEL_ID=@your_kitchen_channel_username
TELEGRAM_WAITER_CHANNEL_ID=@your_waiter_channel_username
\`\`\`

## Step 4: Test Notifications
Run a test notification to ensure everything is working correctly.

## Step 5: Make Channels Private (Optional)
Once everything is working, you can make the channels private again.
`;
  }
}

export default new TelegramService(); 