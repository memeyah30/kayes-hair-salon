# Tholits Salon Appointment System - Setup Guide

## ✅ Completed Features

1. **Authentication System**
   - Admin and Stylist login/logout
   - Protected routes with Sanctum
   - Session management

2. **Separate Dashboards**
   - **Admin Dashboard**: Manage stylists, services, view all appointments
   - **Stylist Dashboard**: View personal appointments and schedule
   - **Customer Dashboard**: Public booking interface

3. **Stylist Management**
   - Multi-select specializations (Haircuts, Hair Color, Manicure, Pedicure, Nail Extension, Rebonding)
   - Working hours management (day of week, start/end time)
   - Time off / Days off management
   - Image uploads

4. **Service Management**
   - CRUD operations
   - Image uploads
   - Duration and pricing

## 🚀 Setup Instructions

### 1. Database Setup
```bash
cd backend
php artisan migrate
php artisan db:seed
```

### 2. Default Login Credentials

**Admin:**
- Email: `admin@tholits.local`
- Password: `admin123`

**Stylist:**
- Email: `stylist1@tholits.local`
- Password: `stylist123`

### 3. Start Servers

**Option 1: One Command (Recommended)**
```bash
# From project root
npm run dev:all
```

**Option 2: Separate Terminals**
```bash
# Terminal 1 - Backend
cd backend
php artisan serve

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Queue Worker (for notifications)
cd backend
php artisan queue:work
```

### 4. Access Points

- **Customer Portal**: http://localhost:5173/
- **Admin Login**: http://localhost:5173/login/admin
- **Stylist Login**: http://localhost:5173/login/stylist

## 📁 Project Structure

```
THOLITS SALON/
├── backend/              # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── StylistController.php
│   │   │   └── ...
│   │   └── Models/
│   │       ├── Admin.php
│   │       ├── Stylist.php
│   │       └── ...
│   └── routes/
│       └── api.php
└── frontend/            # React App
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── StylistDashboard.jsx
    │   │   └── ...
    │   └── components/
    │       ├── ProtectedRoute.jsx
    │       └── Sidebar.jsx
```

## 🔧 Troubleshooting

### Network Error
If you see "Failed to load data from API: Network Error":
1. Ensure Laravel server is running: `php artisan serve`
2. Check CORS configuration in `backend/config/cors.php`
3. Verify API URL in frontend: `http://localhost:8000/api`

### Authentication Issues
- Clear browser localStorage if login fails
- Check that Sanctum is properly configured
- Verify token is being sent in request headers

### Image Upload Issues
- Ensure `backend/public/uploads/stylists/` and `backend/public/uploads/services/` directories exist
- Check file permissions
- Verify image size is under 2MB

## 📝 API Endpoints

### Public
- `GET /api/stylists` - List all stylists
- `GET /api/services` - List all services
- `GET /api/stylists/{id}/availability` - Get availability

### Auth
- `POST /api/login` - Login (admin/stylist)
- `POST /api/logout` - Logout
- `GET /api/me` - Get current user

### Protected (Requires Auth)
- `POST /api/stylists` - Create stylist
- `PATCH /api/stylists/{id}` - Update stylist
- `POST /api/services` - Create service
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment

