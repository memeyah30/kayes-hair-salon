# Kaye's Hair Salon and Spa - Appointment System

A comprehensive appointment booking system for hair salon management with role-based access control for Admin/Owner, Manager, and Staff.

## 📋 Features

### Customer Features
- ✅ Book appointments **without creating an account**
- ✅ View all available services
- ✅ Select multiple services
- ✅ Choose payment method
- ✅ Make downpayment to confirm booking

### Admin/Owner Features
- ✅ Assign roles to staff
- ✅ View and edit all appointments
- ✅ Add, edit, delete salon services and pricing
- ✅ View all appointment history (including missed appointments)
- ✅ View customer ratings for staff services
- ✅ Book, edit, delete, and complete appointments
- ✅ Manage holidays (set salon open/closed days)
- ✅ Set day off for staff
- ✅ Change payment accounts/details
- ✅ Manage staff credentials
- ✅ Update locations and other information
- ✅ Reschedule appointments
- ✅ Receive notifications for new appointments

### Manager Features
- ✅ View all appointments
- ✅ View all appointment history (missed appointments included)
- ✅ View customer ratings for staff services
- ✅ Book, edit, delete, and complete appointments
- ✅ Manage holidays
- ✅ Notify appointments
- ✅ Set day off for salon staff
- ✅ Reschedule appointments

### Staff Features
- ✅ View and complete assigned appointments only
- ✅ Receive notifications for new appointments
- ✅ View assigned appointment history
- ✅ View rescheduled appointments

## 🚀 Quick Start

### Prerequisites
- **XAMPP** (Apache + MySQL)
- **PHP 8.2+**
- **Composer**
- **Node.js** (v18+) and **npm**

### Installation

1. **Start XAMPP** (Apache + MySQL)

2. **Create Database**:
   - Open `http://localhost/phpmyadmin`
   - Create database: `tholits_salon`
   - Collation: `utf8mb4_unicode_ci`

3. **Backend Setup**:
   ```powershell
   cd backend
   composer install
   copy .env.example .env
   php artisan key:generate
   php artisan migrate
   php artisan db:seed
   ```

4. **Frontend Setup**:
   ```powershell
   cd frontend
   npm install
   ```

### Running the Application

**Terminal 1 - Backend:**
```powershell
cd backend
php artisan serve
```
→ Backend runs on `http://localhost:8000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
→ Frontend runs on `http://localhost:5173`

### Access the Application

- **Customer Booking**: `http://localhost:5173/`
- **Admin Login**: `http://localhost:5173/login/admin`
  - Username: `admin`
  - Password: `admin123`

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick command reference

## 🛠️ Technology Stack

### Backend
- **Laravel 12** (PHP Framework)
- **MySQL** (Database)
- **Laravel Sanctum** (Authentication)

### Frontend
- **React 19** (UI Library)
- **Vite** (Build Tool)
- **React Router** (Routing)
- **Axios** (HTTP Client)
- **Tailwind CSS** (Styling)

## 📁 Project Structure

```
THOLITS SALON/
├── backend/              # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   └── Middleware/
│   │   └── Models/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/
├── frontend/             # React Application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── utils/
│   └── package.json
├── SETUP_GUIDE.md        # Detailed setup guide
├── QUICK_REFERENCE.md     # Quick reference
└── README.md             # This file
```

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin/Owner | `admin` | `admin123` |

**Note:** Manager and Staff accounts must be created through the Admin panel.

## 🐛 Troubleshooting

See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for detailed troubleshooting steps.

Common issues:
- **Backend won't start**: Check if port 8000 is available
- **Database connection error**: Verify MySQL is running and `.env` is configured
- **Frontend can't reach backend**: Ensure backend is running and CORS is configured

## 📝 License

This project is developed for educational purposes as a capstone project.

## 👥 Support

For setup assistance, refer to:
1. `SETUP_GUIDE.md` - Comprehensive setup instructions
2. `QUICK_REFERENCE.md` - Quick command reference
3. Laravel logs: `backend/storage/logs/laravel.log`
4. Browser console for frontend errors

---

**Happy Coding! 🎉**


