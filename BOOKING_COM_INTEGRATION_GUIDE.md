# 📘 Complete Booking.com Integration Guide

This guide will walk you through the entire process of integrating your property management system with Booking.com using channel manager technology.

## 🎯 Overview

Channel Manager integration allows you to:
- ✅ Automatically sync room rates and availability 
- ✅ Receive bookings directly into your system
- ✅ Avoid overbookings across multiple platforms
- ✅ Manage everything from one dashboard

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] An active Booking.com property listing
- [ ] Access to Booking.com Extranet (partner portal)
- [ ] Your property management system deployed and accessible
- [ ] SSL certificate (HTTPS) for webhook endpoints

---

## 🚀 Phase 1: Booking.com Account Setup

### Step 1: Access Your Booking.com Extranet

1. **Log into Booking.com Extranet**
   - Go to: https://admin.booking.com/
   - Use your property manager credentials
   - Navigate to your property dashboard

2. **Verify Property Information**
   - Ensure all room types are properly configured
   - Check that pricing and availability are set up
   - Note down your property ID (found in Property > Property details)

### Step 2: Enable Channel Manager API Access

1. **Contact Booking.com Support**
   - Email: connectivity@booking.com  
   - Request: "API access for channel manager integration"
   - Provide: Property ID, contact details, technical contact

2. **Required Information to Provide:**
   ```
   Subject: API Access Request for Channel Manager Integration
   
   Property Name: [Your Property Name]
   Property ID: [Your Property ID]
   Property Address: [Full Address]
   Contact Person: [Your Name]
   Email: [Your Email]
   Phone: [Your Phone]
   Technical Contact: [Developer Email]
   
   We would like to integrate our property management system with 
   Booking.com via channel manager API to synchronize rates, 
   availability, and receive bookings automatically.
   ```

3. **Expected Response Time**
   - Initial response: 1-3 business days
   - API credentials: 5-10 business days after approval

---

## 🔧 Phase 2: Technical Setup in Your System

### Step 1: Create Channel Manager Connection

1. **Access Your Admin Dashboard**
   - Go to: `your-domain.com/admin`
   - Navigate to: Channel Manager (sidebar)
   - Click: "Add Channel"

2. **Configure Booking.com Channel**
   ```
   Channel Type: Booking.com
   Channel Name: "Your Property - Booking.com"
   Payment Model: Choose based on your agreement:
     - "Channel Collects": Booking.com handles payments
     - "Property Collects": You collect payment at check-in
   Commission: 15% (typical rate, adjust based on your agreement)
   Property ID: [From Booking.com]
   API Endpoint: [Provided by Booking.com]
   API Username: [Provided by Booking.com]
   API Password: [Provided by Booking.com]
   ```

3. **Save and Note Channel ID**
   - After creation, note the generated Channel ID
   - This will be used for webhook configuration

### Step 2: Configure Webhook URL

Your webhook URL will be:
```
https://your-domain.com/api/v1/channels/webhooks/booking-com/[CHANNEL_ID]
```

**Example:**
```
https://myhotel.com/api/v1/channels/webhooks/booking-com/cm_123456789
```

---

## 🏨 Phase 3: Room Mapping

### Step 1: Identify Booking.com Room Types

1. **In Booking.com Extranet:**
   - Go to: Property > Room inventory
   - Click on each room type
   - Note the **Room Type ID** (usually a number like `123456`)
   - Note the **Room Type Name** (e.g., "Standard Double Room")

2. **Document Your Rooms:**
   ```
   Local Room: "Deluxe Suite"          → Booking.com: "Superior Room" (ID: 123456)
   Local Room: "Standard Double"       → Booking.com: "Standard Room" (ID: 234567)
   Local Room: "Single Room"           → Booking.com: "Economy Single" (ID: 345678)
   ```

### Step 2: Create Room Mappings

1. **In Your Channel Manager Dashboard:**
   - Click on your Booking.com channel
   - Go to "Room Mapping" tab
   - Click "Add Room Mapping"

2. **For Each Room:**
   ```
   Local Room: [Select from dropdown]
   Booking.com Room Type ID: [Enter the ID from extranet]
   Room Type Name: [Enter name as shown in Booking.com]
   Status: Active
   ```

3. **Verify Mappings**
   - Ensure all your rooms are mapped
   - Check that IDs are correct
   - Confirm mappings are marked as "Active"

---

## 🔗 Phase 4: Webhook Configuration

### Step 1: Configure in Booking.com

1. **Contact Your Booking.com Account Manager**
   - Provide your webhook URL
   - Request webhook setup for:
     - New bookings
     - Booking modifications
     - Cancellations

2. **Webhook URL Format:**
   ```
   https://your-domain.com/api/v1/channels/webhooks/booking-com/[CHANNEL_ID]
   ```

3. **Required Webhook Events:**
   - `reservation.new` - New booking received
   - `reservation.modified` - Booking changes
   - `reservation.cancelled` - Booking cancellations

### Step 2: Test Webhook Reception

1. **Monitor Webhook Logs**
   - Check your server logs for incoming requests
   - Path: `/api/v1/channels/webhooks/booking-com/[CHANNEL_ID]`

2. **Test Booking Flow**
   - Make a test booking on Booking.com (if possible)
   - Verify the booking appears in your system
   - Check that customer details are correct

---

## 💰 Phase 5: Rate and Availability Sync

### Step 1: Initial Rate Setup

1. **Set Base Rates in Your System**
   - Configure your standard room rates
   - Set up any rate policies (seasonal, weekend, etc.)

2. **Configure Rate Distribution**
   - Go to: Channel Manager > Your Channel > Rates
   - Set markup/markdown for Booking.com
   - Configure automatic sync frequency

### Step 2: Availability Management

1. **Set Room Inventory**
   - Define how many rooms are available for Booking.com
   - Configure allocation rules (e.g., 80% to channels, 20% direct)

2. **Block-out Dates**
   - Set maintenance periods
   - Block holidays or special events
   - Configure minimum stay requirements

---

## 🧪 Phase 6: Testing and Validation

### Step 1: Test Rate Sync

1. **Change a rate in your system**
2. **Verify it appears in Booking.com within 15 minutes**
3. **Test different rate types:**
   - Weekend rates
   - Seasonal adjustments
   - Last-minute rates

### Step 2: Test Availability Sync

1. **Block a date in your system**
2. **Verify it shows as unavailable on Booking.com**
3. **Test inventory adjustments:**
   - Reduce room count
   - Increase room count
   - Full block-out

### Step 3: Test Booking Reception

1. **Make a test booking** (coordinate with Booking.com)
2. **Verify booking appears in your system**
3. **Check all data is correct:**
   - Guest information
   - Dates and room type
   - Price and payment details
   - Special requests

---

## 🔍 Phase 7: Monitoring and Optimization

### Step 1: Set Up Monitoring

1. **Monitor Key Metrics:**
   - Booking conversion rates
   - Rate sync success rate
   - Webhook delivery success
   - API response times

2. **Set Up Alerts:**
   - Failed webhook deliveries
   - Rate sync failures
   - Overbooking situations
   - API connectivity issues

### Step 2: Regular Maintenance

1. **Weekly Tasks:**
   - Review channel booking performance
   - Check for any sync errors
   - Verify rate accuracy

2. **Monthly Tasks:**
   - Analyze booking patterns
   - Optimize rate strategies
   - Review commission structure

---

## 🚨 Troubleshooting Common Issues

### Issue 1: Webhook Not Receiving Bookings

**Symptoms:**
- No bookings appearing in your system
- Booking.com shows bookings but your system doesn't

**Solution:**
1. Check webhook URL is correct
2. Verify HTTPS/SSL certificate is valid
3. Check server logs for incoming requests
4. Ensure webhook endpoint is publicly accessible
5. Contact Booking.com to verify webhook configuration

### Issue 2: Rate Sync Not Working

**Symptoms:**
- Rates in Booking.com don't match your system
- Rate changes not reflecting

**Solution:**
1. Verify API credentials are correct
2. Check rate mapping configuration
3. Ensure room mappings are active
4. Check for API rate limits
5. Verify date ranges are correct

### Issue 3: Availability Discrepancies

**Symptoms:**
- Available rooms in your system show as unavailable on Booking.com
- Overbooking situations

**Solution:**
1. Check room inventory allocations
2. Verify room mapping IDs
3. Ensure availability sync is enabled
4. Check for blocked dates in both systems
5. Review minimum stay settings

### Issue 4: Guest Information Missing

**Symptoms:**
- Bookings received but guest details incomplete
- Special requests not showing

**Solution:**
1. Check webhook payload structure
2. Verify data mapping in your system
3. Ensure all required fields are being processed
4. Check for character encoding issues
5. Review Booking.com data format

---

## 📞 Support Contacts

### Booking.com Support
- **General Support:** https://partner.booking.com/en-gb/help
- **API/Technical Support:** connectivity@booking.com
- **Account Manager:** [Your assigned contact]

### Your System Support
- **Technical Issues:** [Your development team]
- **Channel Manager Questions:** [Your admin team]

---

## 📋 Checklist for Go-Live

### Pre-Launch (Complete Before Testing)
- [ ] Booking.com API credentials received and configured
- [ ] Channel manager connection created and active
- [ ] All rooms mapped correctly
- [ ] Webhook URL configured with Booking.com
- [ ] Base rates set in your system
- [ ] Room inventory allocated

### Testing Phase
- [ ] Test booking received successfully
- [ ] Rate sync working both ways
- [ ] Availability sync accurate
- [ ] Guest information complete
- [ ] Payment model working correctly
- [ ] Cancellation flow tested

### Go-Live
- [ ] Monitor first 24 hours closely
- [ ] Check booking notifications
- [ ] Verify rate accuracy
- [ ] Confirm availability sync
- [ ] Document any issues for resolution

### Post-Launch (First Week)
- [ ] Daily monitoring of sync status
- [ ] Review booking conversion rates
- [ ] Check for any error patterns
- [ ] Optimize rate strategies based on performance
- [ ] Document lessons learned

---

## 🎉 Success Metrics

After successful integration, you should see:

- **📈 Increased Bookings:** More reservations from Booking.com
- **⏰ Time Savings:** Automated rate and availability management
- **🎯 Accuracy:** No overbookings or rate discrepancies
- **📊 Better Analytics:** Unified reporting across all channels
- **💰 Revenue Growth:** Optimized pricing and distribution

---

## 📚 Additional Resources

- **Booking.com Partner Hub:** https://partner.booking.com/
- **API Documentation:** [Provided by Booking.com after approval]
- **Channel Manager Best Practices:** [Your system documentation]
- **Revenue Management Guide:** [Your system documentation]

---

**🏆 Congratulations!** 

Once you complete this integration, you'll have a fully automated channel manager connection that will help you maximize your property's revenue and efficiency through Booking.com's global reach.

For any questions or issues during implementation, refer to the troubleshooting section or contact the appropriate support channels listed above.