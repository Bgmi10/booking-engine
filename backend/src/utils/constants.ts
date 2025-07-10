import dotenv from "dotenv";

dotenv.config();

export const TEMP_HOLD_DURATION_MINUTES = 30;
export const baseUrl = process.env.NODE_ENV === "local" ? process.env.BASE_URL_DEV : process.env.BASE_URL_PROD;
export const now = new Date();

export const adminDashboardUrl = `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/admin/dashboard?sidebar=wedding-proposals`;

export const weddingPortalVendorSectionUrl = `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/wedding-portal/dashboard?sidebar=vendors`