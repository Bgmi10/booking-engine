# Channel Manager Integration System - Implementation Guide

## Overview

This implementation provides a comprehensive Channel Manager integration system that allows your booking engine to distribute rates and availability to third-party channels (Booking.com, Expedia, Airbnb) and receive bookings from them.

## Key Features

### ✅ **Rate Distribution**
- Distribute room rates to multiple channels
- Support for markup and commission calculations
- Automatic rate synchronization
- Date-based rate management

### ✅ **Availability Management**
- Real-time availability updates
- Room blocking/unblocking
- Channel-specific availability rules

### ✅ **Booking Integration**
- Receive bookings from external channels via webhooks
- Automatic customer creation
- Payment model support (PAID_TO_CHANNEL, PAID_ON_SITE, MIXED)
- Commission tracking

### ✅ **Payment Management**
- Support for different payment models per channel
- Commission calculation and tracking
- Payment status synchronization

## Database Schema

### New Models Added

1. **ChannelManager** - Configuration for each channel
2. **ChannelRoom** - Room mapping between local and channel systems
3. **ChannelRate** - Rate distribution per room/date
4. **ChannelAvailability** - Availability management per room/date
5. **ChannelBooking** - Incoming bookings from channels
6. **ChannelBookingRoom** - Room details for channel bookings

### Key Relationships

- `Room` ↔ `ChannelRoom` (Many-to-Many)
- `ChannelManager` ↔ `ChannelBooking` (One-to-Many)
- `ChannelRoom` ↔ `ChannelRate` (One-to-Many)
- `ChannelBooking` ↔ `Booking` (Optional One-to-One)

## API Endpoints

### Channel Manager Management
```
POST   /api/channels                    # Create channel manager
GET    /api/channels                    # List all channels
GET    /api/channels/:id                # Get channel details
PUT    /api/channels/:id                # Update channel
DELETE /api/channels/:id                # Delete channel
```

### Room Distribution
```
POST   /api/channels/:channelId/rooms                    # Add room to channel
GET    /api/channels/:channelId/rooms                    # List channel rooms
GET    /api/channels/:channelId/rooms/available          # Get available rooms
PUT    /api/channels/rooms/:id                           # Update channel room
DELETE /api/channels/rooms/:id                           # Remove room from channel
```

### Rate Management
```
POST   /api/channels/rooms/:channelRoomId/rates          # Create rate
PUT    /api/channels/rooms/:channelRoomId/rates          # Update rates (bulk)
GET    /api/channels/rooms/:channelRoomId/rates          # Get rates
```

### Availability Management
```
POST   /api/channels/rooms/:channelRoomId/availability   # Set availability
PUT    /api/channels/rooms/:channelRoomId/availability   # Update availability (bulk)
```

### Booking Management
```
POST   /api/channels/bookings                            # Create channel booking
GET    /api/channels/bookings                            # List channel bookings
GET    /api/channels/bookings/:id                        # Get booking details
PUT    /api/channels/bookings/:id/status                 # Update booking status
```

### Webhook Endpoints
```
POST   /api/webhooks/booking-com/:channelId              # Booking.com webhook
POST   /api/webhooks/expedia/:channelId                  # Expedia webhook
POST   /api/webhooks/airbnb/:channelId                   # Airbnb webhook
POST   /api/webhooks/generic/:channelId                  # Generic webhook
POST   /api/webhooks/convert/:channelBookingId           # Convert to local booking
GET    /api/webhooks/health                              # Health check
```

## Implementation Steps

### 1. Database Migration

Run the Prisma migration to add the new models:

```bash
npx prisma migrate dev --name add-channel-manager
```

### 2. Backend Setup

The following files have been created:

- `backend/src/services/channelManagerService.ts` - Core business logic
- `backend/src/controllers/channelManagerController.ts` - API controllers
- `backend/src/routes/channelManagerRoutes.ts` - API routes
- `backend/src/services/channelWebhookService.ts` - Webhook processing
- `backend/src/controllers/channelWebhookController.ts` - Webhook controllers
- `backend/src/routes/channelWebhookRoutes.ts` - Webhook routes

### 3. Add Routes to Main App

Add the new routes to your main Express app:

```typescript
// In your main app file
import channelManagerRoutes from './routes/channelManagerRoutes';
import channelWebhookRoutes from './routes/channelWebhookRoutes';

app.use('/api', channelManagerRoutes);
app.use('/api', channelWebhookRoutes);
```

### 4. Channel Configuration

#### Example: Booking.com Setup

```json
{
  "name": "Booking.com",
  "code": "booking_com",
  "description": "Booking.com integration",
  "apiEndpoint": "https://distribution-xml.booking.com/2.4/json/bookings",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "webhookUrl": "https://your-domain.com/api/webhooks/booking-com/channel-id",
  "isActive": true,
  "commissionPercentage": 15.0,
  "paymentModel": "PAID_TO_CHANNEL",
  "markupPercentage": 5.0,
  "currency": "eur",
  "syncFrequency": 3600,
  "autoSync": true
}
```

#### Example: Expedia Setup

```json
{
  "name": "Expedia",
  "code": "expedia",
  "description": "Expedia integration",
  "apiEndpoint": "https://api.ean.com/v3/",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "webhookUrl": "https://your-domain.com/api/webhooks/expedia/channel-id",
  "isActive": true,
  "commissionPercentage": 12.0,
  "paymentModel": "PAID_TO_CHANNEL",
  "markupPercentage": 3.0,
  "currency": "eur",
  "syncFrequency": 3600,
  "autoSync": true
}
```

### 5. Room Distribution

For each room you want to distribute:

```json
{
  "roomId": "local-room-id",
  "channelId": "channel-manager-id",
  "channelRoomId": "external-room-id",
  "channelRoomCode": "ROOM_CODE",
  "isActive": true,
  "channelPrice": 150.00,
  "channelCurrency": "eur"
}
```

### 6. Rate Distribution

Set rates for specific dates:

```json
{
  "channelRoomId": "channel-room-id",
  "date": "2024-06-15T00:00:00Z",
  "baseRate": 120.00,
  "channelRate": 126.00,
  "currency": "eur",
  "isAvailable": true,
  "availableRooms": 1
}
```

### 7. Webhook Configuration

Configure webhook URLs in your channel manager accounts:

- **Booking.com**: `https://your-domain.com/api/webhooks/booking-com/{channelId}`
- **Expedia**: `https://your-domain.com/api/webhooks/expedia/{channelId}`
- **Airbnb**: `https://your-domain.com/api/webhooks/airbnb/{channelId}`

## Payment Models

### 1. PAID_TO_CHANNEL
- Channel collects payment from guest
- Channel pays you after commission
- Use for: Booking.com, Expedia

### 2. PAID_ON_SITE
- Guest pays on arrival
- No commission to channel
- Use for: Direct bookings, some Airbnb

### 3. MIXED
- Partial payment to channel
- Remaining payment on site
- Use for: Special arrangements

## Commission Calculation

The system automatically calculates commissions:

```typescript
// Example: 15% commission
const baseRate = 100;
const commission = baseRate * 0.15; // 15
const netAmount = baseRate - commission; // 85

// For markup: 5% markup
const channelRate = baseRate * 1.05; // 105
```

## Webhook Processing

### Booking.com Webhook Example

```json
{
  "reservation_id": "123456789",
  "hotel_id": "your_hotel_id",
  "room_id": "room_123",
  "check_in": "2024-06-15",
  "check_out": "2024-06-17",
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "guest_phone": "+1234567890",
  "total_amount": 300.00,
  "currency": "eur",
  "payment_status": "paid",
  "booking_status": "confirmed",
  "special_requests": "Late check-in"
}
```

### Expedia Webhook Example

```json
{
  "reservationId": "EXP123456",
  "propertyId": "your_property_id",
  "roomTypeId": "room_type_123",
  "arrivalDate": "2024-06-15",
  "departureDate": "2024-06-17",
  "guestFirstName": "John",
  "guestLastName": "Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "totalPrice": 300.00,
  "currency": "eur",
  "paymentStatus": "PAID",
  "reservationStatus": "CONFIRMED"
}
```

## Frontend Integration

### Channel Manager Dashboard

Create a dashboard to manage:

1. **Channel Overview**
   - Active channels
   - Total bookings per channel
   - Revenue and commission tracking

2. **Room Distribution**
   - Which rooms are distributed to which channels
   - Room availability status

3. **Rate Management**
   - Set and update rates
   - View rate history
   - Bulk rate updates

4. **Booking Management**
   - View incoming channel bookings
   - Convert to local bookings
   - Track payment status

### Key Components Needed

1. **ChannelManagerList** - List and manage channels
2. **ChannelRoomDistribution** - Manage room distribution
3. **ChannelRateManager** - Set and update rates
4. **ChannelBookingList** - View channel bookings
5. **ChannelStats** - Analytics and reporting

## Security Considerations

### 1. Webhook Authentication
- Implement webhook signature verification
- Use HTTPS for all webhook endpoints
- Validate webhook payloads

### 2. API Security
- Use API keys for channel integrations
- Implement rate limiting
- Log all webhook activities

### 3. Data Protection
- Encrypt sensitive channel credentials
- Implement proper access controls
- Regular security audits

## Monitoring and Maintenance

### 1. Health Checks
- Monitor webhook endpoints
- Track sync status
- Alert on failures

### 2. Logging
- Log all webhook activities
- Track rate updates
- Monitor booking conversions

### 3. Analytics
- Track channel performance
- Monitor commission payments
- Analyze booking patterns

## Testing

### 1. Webhook Testing
```bash
# Test Booking.com webhook
curl -X POST http://localhost:3000/api/webhooks/booking-com/test-channel-id \
  -H "Content-Type: application/json" \
  -d '{
    "reservation_id": "test_123",
    "hotel_id": "test_hotel",
    "room_id": "test_room",
    "check_in": "2024-06-15",
    "check_out": "2024-06-17",
    "guest_name": "Test Guest",
    "guest_email": "test@example.com",
    "total_amount": 200.00,
    "currency": "eur",
    "payment_status": "paid",
    "booking_status": "confirmed"
  }'
```

### 2. API Testing
```bash
# Test channel creation
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "name": "Test Channel",
    "code": "test_channel",
    "isActive": true,
    "commissionPercentage": 10.0,
    "paymentModel": "PAID_TO_CHANNEL"
  }'
```

## Deployment Checklist

- [ ] Run database migrations
- [ ] Configure environment variables
- [ ] Set up webhook endpoints
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Test webhook endpoints
- [ ] Configure channel manager accounts
- [ ] Set up rate distribution
- [ ] Test booking flow
- [ ] Monitor initial bookings

## Support and Troubleshooting

### Common Issues

1. **Webhook Not Receiving Data**
   - Check webhook URL configuration
   - Verify SSL certificate
   - Check firewall settings

2. **Rate Sync Issues**
   - Verify API credentials
   - Check rate format
   - Monitor sync logs

3. **Booking Conversion Failures**
   - Check room mapping
   - Verify customer creation
   - Review error logs

### Debug Tools

1. **Webhook Logs**
   - Monitor incoming webhook data
   - Track processing status
   - Debug validation errors

2. **Sync Status**
   - Check last sync times
   - Monitor sync failures
   - Track rate updates

3. **Booking Tracking**
   - Monitor booking conversions
   - Track payment status
   - Review customer creation

This implementation provides a robust foundation for channel manager integration that can be extended and customized based on your specific requirements. 