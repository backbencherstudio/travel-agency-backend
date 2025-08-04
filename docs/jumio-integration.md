# Jumio Netverify API v4 Integration

This document describes the integration of Jumio Netverify API v4 for identity verification in the travel agency backend.

## Overview

The Jumio integration provides secure identity verification using Jumio's Netverify API v4. Users can verify their identity by uploading government-issued documents (passports, ID cards, driver's licenses) through Jumio's secure platform.

## Features

- **Identity Verification**: Verify user identity using government-issued documents
- **Face Verification**: Optional face matching with uploaded documents
- **Document Verification**: Support for multiple document types (passport, ID card, driver's license, visa)
- **Real-time Status Updates**: Webhook-based status updates from Jumio
- **Admin Management**: Admin interface for managing verifications
- **Secure Authentication**: HMAC-based API authentication
- **Webhook Validation**: Secure webhook signature validation

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Jumio API Configuration
JUMIO_API_TOKEN=your_jumio_api_token
JUMIO_API_SECRET=your_jumio_api_secret
JUMIO_BASE_URL=https://netverify.com/api/v4
JUMIO_CALLBACK_URL=https://yourapp.com/api/webhooks/jumio/callback
```

## Database Schema

The integration uses the `JumioVerification` model with the following key fields:

```prisma
model JumioVerification {
  id                    String    @id @default(cuid())
  user_id               String?
  jumio_reference_id    String?   @unique
  verification_type     String?   // IDENTITY_VERIFICATION, FACE_VERIFICATION, DOCUMENT_VERIFICATION
  jumio_status          String?   @default("PENDING")
  jumio_result          String?   @db.Text
  document_type         String?   // ID_CARD, PASSPORT, DRIVERS_LICENSE, VISA
  document_country      String?
  document_number       String?
  first_name            String?
  last_name             String?
  date_of_birth         DateTime?
  nationality           String?
  verification_score    Int?
  verification_confidence String?
  jumio_created_at      DateTime?
  jumio_updated_at      DateTime?
  jumio_completed_at    DateTime?
  session_expires_at    DateTime?
  is_completed          Boolean?  @default(false)
  admin_notes           String?   @db.Text
  manually_reviewed     Boolean?  @default(false)
  reviewed_at           DateTime?
  reviewed_by           String?
  error_message         String?   @db.Text
  jumio_error_code      String?
}
```

## API Endpoints

### Admin Endpoints

#### Create Verification

```http
POST /api/admin/jumio-verifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "user123",
  "verification_type": "IDENTITY_VERIFICATION",
  "country": "US",
  "document_type": "PASSPORT",
  "callback_url": "https://yourapp.com/webhook/jumio",
  "user_consent": true,
  "locale": "en-US",
  "enabled_fields": ["firstName", "lastName", "dateOfBirth"]
}
```

#### Get Verification Status

```http
GET /api/admin/jumio-verifications/{id}/status
Authorization: Bearer <token>
```

#### Get Verification Details

```http
GET /api/admin/jumio-verifications/{id}/details
Authorization: Bearer <token>
```

#### List Verifications

```http
GET /api/admin/jumio-verifications?page=1&limit=10&verification_type=IDENTITY_VERIFICATION&jumio_status=PENDING
Authorization: Bearer <token>
```

#### Get Statistics

```http
GET /api/admin/jumio-verifications/stats
Authorization: Bearer <token>
```

### Webhook Endpoints

#### Verification Callback

```http
POST /api/webhooks/jumio/callback
Content-Type: application/json
X-Jumio-Signature: <signature>
X-Jumio-Timestamp: <timestamp>

{
  "scanReference": "jumio_scan_reference",
  "verification": {
    "status": "APPROVED_VERIFIED",
    "document": {
      "type": "PASSPORT",
      "country": "US",
      "number": "123456789"
    },
    "identity": {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "nationality": "US"
    },
    "verification": {
      "confidence": "HIGH",
      "score": 95
    }
  }
}
```

#### Data Retrieval Callback

```http
POST /api/webhooks/jumio/retrieval
Content-Type: application/json
X-Jumio-Signature: <signature>
X-Jumio-Timestamp: <timestamp>
```

## Usage Examples

### Creating a Verification

```typescript
// Create a new verification
const verification = await jumioVerificationService.create({
  user_id: 'user123',
  verification_type: 'IDENTITY_VERIFICATION',
  country: 'US',
  document_type: 'PASSPORT',
  user_consent: true,
  locale: 'en-US',
});

// Response includes Jumio URLs
console.log(verification.data.jumio_redirect_url); // Redirect user to this URL
console.log(verification.data.jumio_web_url); // Web SDK URL
console.log(verification.data.jumio_sdk_url); // Mobile SDK URL
```

### Checking Verification Status

```typescript
// Get real-time status from Jumio
const status =
  await jumioVerificationService.getVerificationStatus('verification_id');

console.log(status.data.jumio_status); // PENDING, APPROVED_VERIFIED, DENIED_FRAUD, etc.
console.log(status.data.verification_score); // 0-100 confidence score
console.log(status.data.first_name); // Extracted from document
console.log(status.data.last_name); // Extracted from document
```

### Handling Webhooks

The system automatically processes Jumio webhooks and updates verification status in real-time. Webhooks are validated using HMAC signatures for security.

## Verification Types

### IDENTITY_VERIFICATION

- Verifies identity using government-issued documents
- Extracts personal information (name, date of birth, nationality)
- Provides confidence score and verification status

### FACE_VERIFICATION

- Compares user's face with document photo
- Requires additional face capture during verification
- Enhanced security for high-risk applications

### DOCUMENT_VERIFICATION

- Verifies document authenticity and validity
- Checks for tampering and forgery
- Validates document expiration dates

## Document Types

- **PASSPORT**: International passport
- **ID_CARD**: National identity card
- **DRIVERS_LICENSE**: Driver's license
- **VISA**: Travel visa

## Verification Statuses

- **PENDING**: Verification in progress
- **APPROVED_VERIFIED**: Successfully verified
- **DENIED_FRAUD**: Fraudulent document detected
- **DENIED_UNSUPPORTED_ID_TYPE**: Document type not supported
- **DENIED_UNSUPPORTED_ID_COUNTRY**: Document country not supported
- **ERROR_NOT_READABLE_ID**: Document image quality issues
- **NO_ID_UPLOADED**: No document uploaded

## Security Features

### API Authentication

- HMAC-SHA256 signature-based authentication
- Timestamp and nonce for replay protection
- Secure header-based authentication

### Webhook Security

- HMAC signature validation
- Timestamp validation
- Payload integrity verification

### Data Protection

- Sensitive data encrypted in database
- Secure transmission using HTTPS
- Audit trail for all verification attempts

## Error Handling

The integration includes comprehensive error handling:

```typescript
try {
  const verification = await jumioVerificationService.create(request);
} catch (error) {
  if (error.message.includes('User not found')) {
    // Handle user not found
  } else if (error.message.includes('Jumio verification creation failed')) {
    // Handle Jumio API errors
  }
}
```

## Testing

### Test Environment

- Use Jumio's test environment for development
- Test webhooks using tools like ngrok
- Validate signature generation and verification

### Test Data

- Use test documents provided by Jumio
- Test various verification scenarios
- Validate error handling with invalid data

## Monitoring and Logging

The integration includes comprehensive logging:

```typescript
// Log levels
logger.log('Jumio verification created successfully');
logger.error('Failed to create Jumio verification', error);
logger.warn('Webhook signature validation failed');
```

## Best Practices

1. **Always validate webhook signatures** before processing
2. **Store Jumio reference IDs** for tracking
3. **Handle all verification statuses** appropriately
4. **Implement proper error handling** for API failures
5. **Use HTTPS** for all communications
6. **Monitor verification success rates** and failure reasons
7. **Implement retry logic** for transient failures
8. **Keep API credentials secure** and rotate regularly

## Troubleshooting

### Common Issues

1. **Invalid API credentials**: Check JUMIO_API_TOKEN and JUMIO_API_SECRET
2. **Webhook signature validation fails**: Verify webhook secret and signature generation
3. **Verification not found**: Check jumio_reference_id mapping
4. **API timeout**: Increase timeout values for slow connections

### Debug Mode

Enable debug logging by setting the log level to debug in your application configuration.

## Support

For Jumio API support:

- Jumio Developer Documentation: https://netverify.com/api/v4
- Jumio Support: https://support.jumio.com
- API Status: https://status.jumio.com

For integration support:

- Check application logs for detailed error messages
- Verify environment variables are correctly set
- Test webhook endpoints using Jumio's test tools
