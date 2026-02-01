# Email & SMS Setup Guide for Tholits Salon

## Problem
Customers are not receiving confirmation emails/SMS after booking appointments because the mail driver is set to `'log'` instead of a real email service.

## Solution: Configure Email Sending

### Option 1: Gmail SMTP (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Tholits Salon" as the name
   - Copy the 16-character password generated

3. **Update your `.env` file** in the `backend` folder:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="Tholits Salon"
```

4. **Clear config cache**:
```bash
cd backend
php artisan config:clear
php artisan cache:clear
```

### Option 2: Mailtrap (Best for Development/Testing)

1. **Sign up** at https://mailtrap.io (free tier available)
2. **Get SMTP credentials** from your inbox
3. **Update `.env`**:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@tholitssalon.com
MAIL_FROM_NAME="Tholits Salon"
```

### Option 3: Production Email Services

#### Using Mailgun:
```env
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=your-domain.com
MAILGUN_SECRET=your-mailgun-secret
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="Tholits Salon"
```

#### Using SendGrid:
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="Tholits Salon"
```

## SMS Setup (Optional - Currently Not Implemented)

SMS functionality is currently a placeholder. To implement SMS:

1. **Choose an SMS provider**:
   - Twilio (recommended)
   - Semaphore (Philippines-friendly)
   - Nexmo/Vonage

2. **Example with Twilio**:
   - Sign up at https://www.twilio.com
   - Get Account SID and Auth Token
   - Add to `.env`:
   ```env
   TWILIO_SID=your-account-sid
   TWILIO_TOKEN=your-auth-token
   TWILIO_PHONE=+1234567890
   ```

3. **Install Twilio SDK**:
   ```bash
   cd backend
   composer require twilio/sdk
   ```

4. **Update `SendConfirmationJob.php`** to uncomment and configure the Twilio code (lines 128-133)

## Testing Email Configuration

After configuring, test by:

1. **Making a test booking** with a valid email
2. **Check Laravel logs** at `backend/storage/logs/laravel.log`
3. **Look for**:
   - `✓ Confirmation email sent successfully` (if working)
   - `Mail driver is set to "log"` (if still not configured)
   - Error messages (if configuration is wrong)

## Troubleshooting

### Emails still not sending?

1. **Check `.env` file**:
   - Make sure `MAIL_MAILER=smtp` (not `log`)
   - Verify all SMTP credentials are correct
   - No extra spaces or quotes around values

2. **Clear cache**:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

3. **Check logs**:
   ```bash
   tail -f backend/storage/logs/laravel.log
   ```

4. **Test SMTP connection**:
   - Use a tool like https://www.smtper.net/ to test your SMTP settings

5. **Gmail-specific issues**:
   - Make sure you're using an **App Password**, not your regular password
   - Enable "Less secure app access" if not using App Password (not recommended)
   - Check if Gmail is blocking the connection

### Common Errors:

- **"Connection refused"**: Wrong port or host
- **"Authentication failed"**: Wrong username/password
- **"Could not authenticate"**: Gmail needs App Password, not regular password
- **"Emails logged but not sent"**: `MAIL_MAILER` is still set to `log`

## Current Status

- ✅ Email confirmation code is implemented
- ✅ Email is sent immediately after booking
- ⚠️ Email driver needs to be configured (currently set to 'log')
- ⚠️ SMS is placeholder only (needs integration)

## Next Steps

1. Choose an email service (Gmail SMTP for testing, or production service)
2. Update `.env` file with correct credentials
3. Clear config cache
4. Test by making a booking
5. Check email inbox (or Mailtrap inbox if using Mailtrap)
