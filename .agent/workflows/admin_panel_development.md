---
description: Workflow for developing the Chargerzilla Admin Panel Backend (Phase 1)
---

# Admin Panel Development Workflow (Phase 1)

This workflow guides the development of the backend API for the Chargerzilla Admin Panel.

## 1. Prerequisites (Done)
- [x] Database Analysis (Schema, Relationships, Key Tables identified).
- [x] Implementation Plan Created (`implementation_plan.md`).

## 2. API Structure Setup
1.  **Create Route Files**:
    - `routes/admin/users.js`
    - `routes/admin/stations.js` (Public & Private)
    - `routes/admin/dashboard.js` (Overview stats)
2.  **Initialize Entry Point**:
    - Mount `/api/admin` in `app.js` or main server file.
    - Ensure `adminAuth` middleware is applied.

## 3. Implementation - User Management
1.  **List Users**:
    - Implement `GET /api/admin/users`.
    - Support query params: `page`, `limit`, `search`, `role`.
    - Join with `ChargerListing` count and `Booking` count for quick stats.
2.  **User Details**:
    - Implement `GET /api/admin/users/:id`.
    - Return full profile + related counts (Chargers, Bookings).
3.  **Update User**:
    - Implement `PATCH /api/admin/users/:id`.
    - Allow toggling `active_status`.

## 4. Implementation - Public Stations
1.  **List Public Stations**:
    - Implement `GET /api/admin/stations/public`.
    - Optimize large dataset (index-based pagination if possible).
2.  **Station Details**:
    - Implement `GET /api/admin/stations/public/:id`.
    - Resolve ID lookup tables (`cities`, `network_types`).

## 5. Implementation - Private Chargers
1.  **List Private Chargers**:
    - Implement `GET /api/admin/stations/private`.
    - Include Host info (Join `master_user`).
2.  **Charger Details**:
    - Implement `GET /api/admin/stations/private/:id`.
    - Fetch associated `ChargerMedia`, `ChargerTiming`.
    - Fetch reviews (link via `iid`).
3.  **Moderation**:
    - Implement `DELETE /api/admin/stations/private/:id/media/:mediaId`.
    - Implement `PATCH /api/admin/stations/private/:id` (Suspend/Draft).

## 6. Testing & Validation
1.  **Manual Test**: Use Postman/Curl to verify endpoints.
2.  **Edge Case Check**:
    - Verify deleted users don't break listing views.
    - Verify correct ID usage (UUID vs Int) for private chargers.

## 7. Documentation
1.  Update `swagger.yaml` or API docs with new Admin endpoints.
