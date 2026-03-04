# Cambrian – API Design

## Conventions

- Base URL: `https://api.cambrian.io/api`
- All endpoints return JSON
- Authentication: `Authorization: Bearer <jwt_token>` (except public endpoints)
- Dates: ISO 8601 (`2024-11-01T14:30:00Z`)
- Pagination: `?page=1&pageSize=20` query parameters
- Error format:

```json
{
  "status": 400,
  "error": "ValidationError",
  "message": "Track title is required.",
  "details": []
}
```

---

## Authentication

### POST `/auth/register`
Register a new account.

**Request:**
```json
{
  "email": "creator@example.com",
  "password": "SecurePass123!",
  "displayName": "DJ Sample"
}
```

**Response `201`:**
```json
{
  "userId": "a1b2c3d4",
  "email": "creator@example.com",
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBp..."
}
```

---

### POST `/auth/login`
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "creator@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "dGhpcyBp...",
  "expiresIn": 900
}
```

---

### POST `/auth/refresh`
Exchange a refresh token for a new access token.

**Request:**
```json
{ "refreshToken": "dGhpcyBp..." }
```

**Response `200`:**
```json
{ "accessToken": "eyJhbGci...", "expiresIn": 900 }
```

---

## Tracks

### GET `/tracks`
Browse the marketplace. Public endpoint.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Full-text search on title / tags |
| `genre` | string | Filter by genre |
| `licenseType` | string | `personal`, `commercial`, `exclusive` |
| `minBpm` | int | Minimum BPM |
| `maxBpm` | int | Maximum BPM |
| `page` | int | Page number (default: 1) |
| `pageSize` | int | Items per page (default: 20, max: 100) |

**Response `200`:**
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 342,
  "items": [
    {
      "id": "t_abc123",
      "title": "Neon Drift",
      "creatorId": "u_xyz789",
      "creatorName": "DJ Sample",
      "genre": "Electronic",
      "bpm": 128,
      "durationSeconds": 210,
      "artworkUrl": "https://cdn.cambrian.io/artwork/t_abc123.jpg",
      "previewUrl": "https://cdn.cambrian.io/previews/t_abc123.mp3",
      "licenses": [
        { "type": "personal", "price": 9.99 },
        { "type": "commercial", "price": 49.99 }
      ],
      "createdAt": "2024-10-15T09:00:00Z"
    }
  ]
}
```

---

### GET `/tracks/{id}`
Get full details for a single track. Public endpoint.

**Response `200`:**
```json
{
  "id": "t_abc123",
  "title": "Neon Drift",
  "description": "Dark synthwave with driving bass.",
  "creatorId": "u_xyz789",
  "creatorName": "DJ Sample",
  "genre": "Electronic",
  "tags": ["synthwave", "dark", "bass"],
  "bpm": 128,
  "key": "Am",
  "durationSeconds": 210,
  "artworkUrl": "https://cdn.cambrian.io/artwork/t_abc123.jpg",
  "previewUrl": "https://cdn.cambrian.io/previews/t_abc123.mp3",
  "licenses": [
    { "type": "personal",   "price": 9.99,  "description": "Non-commercial use" },
    { "type": "commercial", "price": 49.99, "description": "Commercial use, up to 100k streams" },
    { "type": "exclusive",  "price": 299.00,"description": "Full exclusive rights" }
  ],
  "plays": 1204,
  "createdAt": "2024-10-15T09:00:00Z"
}
```

---

### POST `/tracks`
Upload a new track. Requires authentication (creator role).

**Request (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `audioFile` | file | WAV or MP3, max 100 MB |
| `artworkFile` | file | JPEG/PNG, min 1400×1400 px |
| `title` | string | Track title |
| `genre` | string | Genre |
| `bpm` | int | Beats per minute |
| `key` | string | Musical key (e.g., `Am`) |
| `tags` | string[] | Up to 10 tags |
| `licenses` | JSON string | Array of `{ type, price }` objects |

**Response `201`:**
```json
{
  "id": "t_newtrack",
  "status": "processing",
  "message": "Your track is being processed. It will appear in the marketplace within a few minutes."
}
```

---

### DELETE `/tracks/{id}`
Delete a track. Creator or admin only.

**Response `204` No Content**

---

## Orders

### POST `/orders`
Create a new order and initiate Stripe Checkout. Requires authentication.

**Request:**
```json
{
  "items": [
    { "trackId": "t_abc123", "licenseType": "commercial" }
  ]
}
```

**Response `201`:**
```json
{
  "orderId": "o_xyz456",
  "stripeSessionUrl": "https://checkout.stripe.com/pay/cs_test_..."
}
```

---

### GET `/orders/{id}`
Get order details. Requires authentication (owner or admin).

**Response `200`:**
```json
{
  "id": "o_xyz456",
  "status": "completed",
  "total": 49.99,
  "items": [
    {
      "trackId": "t_abc123",
      "trackTitle": "Neon Drift",
      "licenseType": "commercial",
      "price": 49.99,
      "downloadUrl": "https://s3.amazonaws.com/...?presigned..."
    }
  ],
  "createdAt": "2024-11-01T14:30:00Z"
}
```

---

## Creator Dashboard

### GET `/creators/me/stats`
Get earnings and analytics for the authenticated creator.

**Response `200`:**
```json
{
  "totalEarnings": 1240.50,
  "pendingPayout": 320.00,
  "trackCount": 14,
  "totalPlays": 45320,
  "totalSales": 87,
  "recentSales": [
    {
      "orderId": "o_xyz456",
      "trackTitle": "Neon Drift",
      "licenseType": "commercial",
      "amount": 49.99,
      "date": "2024-11-01T14:30:00Z"
    }
  ]
}
```

---

## Webhooks

### POST `/webhooks/stripe`
Receives Stripe webhook events. Validated using `Stripe-Signature` header (HMAC SHA-256).

**Handled events:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Mark order as complete, grant download access |
| `invoice.paid` | Activate / renew subscription |
| `invoice.payment_failed` | Notify user, downgrade subscription |
