# Booking er Por API Call Sequence

## 📋 Overview

Booking create korar por ki ki API call kora lagbe - Admin, Vendor, ar User er jonno alada alada.

---

## 👤 **USER (Client) - API Call Sequence**

### 1️⃣ **Booking Create**

```
POST /api/booking
Headers: Authorization: Bearer {token}
Body: {
  "checkout_id": "checkout_id",
  "booking_type": "book",
  "payment_method": {
    "type": "stripe",
    "data": {
      "amount": 100.00,
      "currency": "usd"
    }
  }
}

Response: {
  "success": true,
  "data": {
    "booking_id": "booking_id",
    "client_secret": "pi_xxx_secret_xxx",
    "payment_intent_id": "pi_xxx",
    "payment_status": "pending",
    "final_price": 100.00
  }
}
```

### 2️⃣ **Frontend e Payment Complete** (Stripe Elements)

- Frontend e `client_secret` use kore payment complete kore
- Stripe automatically webhook send kore backend e

### 3️⃣ **Check Payment Status** (Optional - Polling)

```
GET /api/booking/{booking_id}
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "id": "booking_id",
    "payment_status": "succeeded", // or "pending", "failed"
    "escrow_status": "held",
    "paid_amount": 100.00,
    "status": "approved"
  }
}
```

### 4️⃣ **View My Bookings**

```
GET /api/user/dashboard/bookings?page=1&limit=10&status=all
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "bookings": [...],
    "pagination": {...}
  }
}
```

### 5️⃣ **View Booking Details**

```
GET /api/user/dashboard/bookings/{booking_id}
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "booking": {...},
    "payment": {...},
    "escrow": {...}
  }
}
```

### 6️⃣ **Cancel Booking** (If needed - >30 days before trip)

```
POST /api/escrow/cancel-client/{booking_id}
Headers: Authorization: Bearer {token}
Body: {
  "cancellation_reason": "Reason here"
}

Response: {
  "success": true,
  "message": "Booking cancelled, 50% refunded",
  "refundAmount": 50.00
}
```

---

## 🏢 **VENDOR - API Call Sequence**

### 1️⃣ **Check New Booking Notification**

- Real-time notification receive kore (WebSocket)
- Or manually check korte pare

### 2️⃣ **View All Bookings**

```
GET /api/booking?page=1&limit=10&approve=pending
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "bookings": [...],
    "pagination": {...}
  }
}
```

### 3️⃣ **View Booking Details**

```
GET /api/booking/{booking_id}
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "booking": {...},
    "payment_status": "succeeded",
    "escrow_status": "held"
  }
}
}
```

### 4️⃣ **View Retained Funds (Escrow)**

```
GET /api/escrow/funds
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "total_held": 5000.00,
    "bookings_count": 10,
    "bookings": [
      {
        "booking_id": "xxx",
        "invoice_number": "INV-001",
        "amount": 500.00,
        "escrow_status": "held",
        "package_name": "Package Name"
      }
    ]
  }
}
```

### 5️⃣ **View Unified Payment Dashboard**

```
GET /api/payment/dashboard
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "summary": {
      "payment": {
        "total_received": 10000.00,
        "succeeded": 10000.00,
        "pending": 0,
        "failed": 0
      },
      "escrow": {
        "total_held": 5000.00,
        "total_released": 5000.00,
        "held_bookings_count": 5,
        "released_bookings_count": 5
      },
      "commission": {
        "total_commission": 0, // Vendors don't get commission
        "vendor_commission": 0
      }
    },
    "bookings": [...]
  }
}
```

### 6️⃣ **Stripe Connect Onboarding** (First time only)

```
GET /api/escrow/onboarding-link
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "url": "https://connect.stripe.com/..."
  }
}
```

### 7️⃣ **Release Funds** (After trip completion)

```
POST /api/escrow/release-final/{booking_id}
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "message": "Funds released successfully",
  "released_amount": 800.00
}
```

### 8️⃣ **Cancel Booking** (Provider cancellation - Full refund)

```
POST /api/escrow/cancel-provider/{booking_id}
Headers: Authorization: Bearer {token}
Body: {
  "cancellation_reason": "Reason here"
}

Response: {
  "success": true,
  "message": "Booking cancelled by provider, full refund issued",
  "refundAmount": 100.00
}
```

### 9️⃣ **Handle Dispute** (If needed)

```
POST /api/escrow/dispute/{booking_id}
Headers: Authorization: Bearer {token}
Body: {
  "dispute_reason": "Reason here"
}

Response: {
  "success": true,
  "message": "Dispute registered, payment held until resolution"
}
```

---

## 👨‍💼 **ADMIN - API Call Sequence**

### 1️⃣ **View All Bookings**

```
GET /api/admin/booking?page=1&limit=10&status=all
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "bookings": [...],
    "pagination": {...}
  }
}
```

### 2️⃣ **View Booking Details**

```
GET /api/admin/booking/{booking_id}
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "booking": {...},
    "payment": {...},
    "escrow": {...},
    "commission": {...}
  }
}
```

### 3️⃣ **View Unified Payment Dashboard** (All data)

```
GET /api/payment/dashboard
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "summary": {
      "payment": {
        "total_received": 100000.00,
        "succeeded": 100000.00,
        "pending": 5000.00,
        "failed": 1000.00,
        "succeeded_count": 100,
        "pending_count": 5,
        "failed_count": 2
      },
      "escrow": {
        "total_held": 50000.00,
        "total_released": 50000.00,
        "held_bookings_count": 50,
        "released_bookings_count": 50
      },
      "commission": {
        "total_commission": 20000.00,
        "platform_commission": 20000.00,
        "vendor_commission": 0,
        "pending_approval": 5000.00,
        "approved": 10000.00,
        "paid": 5000.00
      }
    },
    "bookings": [...]
  }
}
```

### 4️⃣ **View Commission Summary**

```
GET /api/admin/commission/summary
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "total_commission": 20000.00,
    "platform_commission": 20000.00,
    "pending_approval": 5000.00,
    "approved": 10000.00,
    "paid": 5000.00
  }
}
```

### 5️⃣ **Approve Commission** (If needed)

```
POST /api/admin/commission/{commission_id}/approve
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "message": "Commission approved"
}
```

### 6️⃣ **Release Escrow Funds** (Manual release if needed)

```
POST /api/escrow/release-partial
Headers: Authorization: Bearer {token}
Body: {
  "booking_id": "booking_id",
  "percentage": 50
}

Response: {
  "success": true,
  "message": "Partial release completed",
  "released_amount": 400.00
}
```

### 7️⃣ **Resolve Dispute**

```
POST /api/escrow/resolve-dispute/{booking_id}
Headers: Authorization: Bearer {token}
Body: {
  "resolution": "release", // or "refund"
  "resolution_notes": "Notes here"
}

Response: {
  "success": true,
  "message": "Dispute resolved, funds released"
}
```

### 8️⃣ **View All Escrow Status**

```
GET /api/admin/escrow/status
Headers: Authorization: Bearer {token}

Response: {
  "success": true,
  "data": {
    "held": [...],
    "released": [...],
    "refunded": [...]
  }
}
```

---

## 🔄 **Automatic Flow (Backend - No API Call Needed)**

### After Payment Success (Webhook):

1. ✅ **Payment Status Update** - Automatically `succeeded` hoy
2. ✅ **Commission Calculation** - Automatically calculate hoy (20%)
3. ✅ **Escrow Hold** - Automatically funds hold hoy
4. ✅ **Notification** - Vendor ke notification jay

### After Trip Completion:

1. ✅ **Auto Release** - 48 hours por auto-release (if client confirms)
2. ✅ **Weekly Payout** - Weekly cron job automatically payout kore

---

## 📝 **Important Notes**

1. **Payment Flow:**

   - User booking create korle payment intent create hoy
   - Frontend e payment complete korle Stripe webhook send kore
   - Webhook automatically payment status, commission, escrow handle kore

2. **Escrow Flow:**

   - Payment success hole automatically `held` status e jay
   - Trip complete hole vendor manually release korte pare
   - Or 48 hours por auto-release hoy

3. **Commission Flow:**

   - Payment success hole automatically calculate hoy
   - Admin approve korte pare (optional)
   - Commission platform er (20%)

4. **Cancellation:**
   - Client cancel (>30 days): 50% refund
   - Provider cancel: 100% refund
   - <30 days: Deposit non-refundable

---

## 🎯 **Quick Reference**

### User:

1. `POST /api/booking` - Create booking
2. `GET /api/booking/{id}` - Check status
3. `GET /api/user/dashboard/bookings` - View bookings
4. `POST /api/escrow/cancel-client/{id}` - Cancel booking

### Vendor:

1. `GET /api/booking` - View bookings
2. `GET /api/escrow/funds` - View held funds
3. `GET /api/payment/dashboard` - Unified dashboard
4. `POST /api/escrow/release-final/{id}` - Release funds
5. `GET /api/escrow/onboarding-link` - Stripe Connect setup

### Admin:

1. `GET /api/admin/booking` - View all bookings
2. `GET /api/payment/dashboard` - Unified dashboard (all data)
3. `POST /api/escrow/release-partial` - Manual release
4. `POST /api/escrow/resolve-dispute/{id}` - Resolve disputes

---

**Last Updated:** Based on current codebase structure
