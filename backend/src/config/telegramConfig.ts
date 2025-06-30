import dontenv from "dotenv";

dontenv.config();

export const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  botName: process.env.TELEGRAM_BOT_NAME,
  mainChannelId: process.env.TELEGRAM_CHANNEL_ID,
  kitchenChannelId:  process.env.TELEGRAM_KITCHEN_CHANNEL_ID,
  waiterChannelId:  process.env.TELEGRAM_WAITER_CHANNEL_ID,
  frontendBaseUrl: process.env.NODE_ENV === "local" ? 
    process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL   
}; 