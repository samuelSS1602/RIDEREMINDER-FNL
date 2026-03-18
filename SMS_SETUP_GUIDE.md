# SMS Integration Setup Guide for RideReminder

This guide walks you through setting up automated SMS functionality for your RideReminder vehicle management system.

## Overview

The SMS system uses:
- **Twilio** for sending SMS messages
- **Firebase Cloud Functions** for backend processing
- **Automated scheduling** to send reminders for expiring documents

---

## Step 1: Set Up Twilio Account

### 1.1 Create Twilio Account
1. Go to [Twilio.com](https://www.twilio.com)
2. Click **Sign Up** and create a free trial account
3. Verify your email and phone number
4. The free account gives you $15 credit (~240 SMS messages)

### 1.2 Get Twilio Credentials
1. Log in to Twilio Console
2. Go to **Account Info** (top-left corner)
3. Copy and save these three values:
   - **Account SID** (looks like: `ACxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (looks like: `your_auth_token_here`)
   - **Phone Number** (looks like: `+1234567890`)

### 1.3 Get a Twilio Phone Number
1. In Twilio Console, go to **Phone Numbers** > **Manage Numbers**
2. Click **Buy a number**
3. Choose country (India for +91), keep defaults
4. Click **Buy**
5. Save your assigned Twilio number (e.g., `+1234567890`)

---

## Step 2: Set Up Firebase Cloud Functions

### 2.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2.2 Create Functions Project

```bash
# Create a functions directory in your project
mkdir functions
cd functions

# Initialize Firebase Functions
firebase init functions
```

When prompted:
- Select your Firebase project from the list
- Choose **JavaScript** as language
- Say **No** to ESLint
- Install dependencies: **Yes**

### 2.3 Copy Cloud Function Code

1. Open `/functions/index.js`
2. Delete the default content
3. Copy the entire content from [sendSMS.js](./sendSMS.js)
4. Paste it into `/functions/index.js`

### 2.4 Install Twilio Package

In the `functions` directory, run:

```bash
npm install twilio
```

### 2.5 Configure Environment Variables

Create a file `/functions/.env.local` with your Twilio credentials:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 2.6 Update Firebase Configuration

In `/functions/index.js`, ensure the Twilio initialization looks like this:

```javascript
const twilioAccountSid = functions.config().twilio.account_sid;
const twilioAuthToken = functions.config().twilio.auth_token;
const twilioPhoneNumber = functions.config().twilio.phone_number;
```

### 2.7 Deploy Cloud Functions

```bash
# From project root directory
firebase deploy --only functions
```

This will deploy:
- `sendSMSToVehicle` - Send SMS to single vehicle
- `sendBulkSMS` - Send SMS to multiple vehicles
- `sendAutomatedExpiryReminders` - Scheduled daily reminders at 9 AM

---

## Step 3: Configure Frontend

### 3.1 Update HTML Files

1. Open `VEHPAGE.html`
2. Ensure these lines are included in `<head>`:
   ```html
   <link rel="stylesheet" href="./smsStyles.css">
   <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-functions.js"></script>
   ```

3. Ensure before closing `</body>`:
   ```html
   <script src="./smsIntegration.js"></script>
   ```

### 3.2 Verify Files Present

Ensure these files exist in your HTML directory:
- ✅ `smsStyles.css` - SMS modal styling
- ✅ `smsIntegration.js` - SMS frontend logic
- ✅ `VEHPAGE.html` - Updated with SMS button
- ✅ `VEHPAGE.JS` - Updated with SMS table action

---

## Step 4: Set SMS Constants in Firebase

### 4.1 Set Configuration Variables

Run these commands from your project root:

```bash
firebase functions:config:set twilio.account_sid="ACxxxxxxxxxxxxxxxxxxxxxx"
firebase functions:config:set twilio.auth_token="your_auth_token_here"
firebase functions:config:set twilio.phone_number="+1234567890"
```

Replace values with your actual Twilio credentials.

### 4.2 Deploy with Configuration

```bash
firebase deploy --only functions
```

---

## Step 5: Test SMS Functionality

### 5.1 Test Frontend Button

1. Log in to your Vehicle Management Dashboard
2. Click the **SMS button** (envelope icon) next to any vehicle
3. A modal will open showing:
   - Customer name
   - Phone number
   - Pre-filled message
   - Character counter (SMS limit: 160 characters)

### 5.2 Send Test SMS

1. Click **Send SMS**
2. You should see: `"SMS sent successfully"`
3. Check if the recipient received the message

### 5.3 Check SMS Logs

Open browser **Console** (F12) and run:

```javascript
showSMSLogs()
```

This displays all SMS sent from your account in a table.

---

## Features Explained

### 1. Manual SMS Sending
- Click the SMS button (📧) on any vehicle row
- Customize the message in the modal that appears
- Send to a specific customer
- Character counter helps optimize message length

### 2. Automated Reminders
- **Scheduled daily at 9 AM IST**
- Automatically checks all vehicles
- Sends SMS for documents expiring within **7 days**
- Includes document names and days remaining
- Logs all sent messages

### 3. Bulk SMS
- Select multiple vehicles
- Send same message to all
- Useful for announcements or general notices

---

## Message Examples

### Manual SMS Example:
```
Hi RAJESH,

This is a reminder regarding your vehicle TN01AB1234.

The following documents are approaching expiry:

FC - 5 days left
Insurance - 3 days left

Please renew them at the earliest.

Thank you!
Sri Balaji Driving School
Palani. Contact: 9842816621
```

### Automated Reminder Example:
```
Hi RAJESH,

This is a reminder that your vehicle TN01AB1234 has the following documents expiring soon:

Permit - 5 days left
Tax - 7 days left

Please renew them at the earliest.

Thank you!
Sri Balaji Driving School
Palani. Contact: 9842816621
```

---

## Troubleshooting

### Issue: SMS button not appearing

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh page (Ctrl+Shift+R)
3. Check console (F12) for errors
4. Verify `smsIntegration.js` is loaded

### Issue: "SMS functions not initialized"

**Solution:**
1. Check Firebase Functions are deployed: `firebase deploy --only functions`
2. Verify firebase-functions library is included in HTML
3. Check browser console for errors

### Issue: Twilio error "Invalid phone number"

**Solution:**
1. Phone number must include country code: `+91XXXXXXXXXX`
2. Verify phone number format in database
3. Test with a known valid number first

### Issue: SMS not sending but no error

**Solution:**
1. Check Twilio account balance (need at least $0.01 credit)
2. Verify Twilio phone number is active
3. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

### Issue: Automated reminders not sending

**Solution:**
1. Cloud Function must be deployed: `firebase deploy --only functions`
2. Check timezone is set to Asia/Kolkata
3. Wait until 9 AM IST next day (or test manually)
4. View function logs: `firebase functions:log`

---

## Pricing

### Twilio Pricing
- **Free Trial**: $15 credit / ~240 SMS
- **After trial**: $0.0075 USD per SMS (India rates may vary)

### Firebase Pricing
- **Free tier**: 125,000 function invocations per month
- **Invocation cost**: $0.40 per 1 million invocations
- Cloud Functions suitable for small to medium deployments

---

## Security Best Practices

### 1. Protect Credentials
- ✅ Never commit credentials to GitHub
- ✅ Use environment variables
- ✅ Use Firebase config variables
- ✅ Keep Auth Token private

### 2. Firebase Security Rules
Add to `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access
    match /smsLogs/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /vehicles/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### 3. Rate Limiting
The Cloud Function includes validation:
- Only authenticated users can send SMS
- Invalid data is rejected
- Phone numbers are validated

---

## Advanced Usage

### Custom Message Template

Edit `generateSMSMessage()` in `smsIntegration.js`:

```javascript
function generateSMSMessage(vehicle) {
    return `Custom message for ${vehicle.customerName}...`;
}
```

### Change Reminder Schedule

Edit in `sendSMS.js` Cloud Function:

```javascript
// Change from daily 9 AM to different schedule
exports.sendAutomatedExpiryReminders = functions.pubsub
    .schedule('0 14 * * *')  // 2 PM instead
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
        // ... rest of function
    });
```

### Change Warning Days

Edit in `sendSMS.js`:

```javascript
const warningDays = 7;  // Change to 14 for 2-week warnings
```

---

## Support & Documentation

- **Twilio Docs**: https://www.twilio.com/docs
- **Firebase Functions**: https://firebase.google.com/docs/functions
- **SMS API**: https://www.twilio.com/docs/sms/api

---

## Next Steps

1. ✅ Complete all setup steps above
2. ✅ Deploy Cloud Functions
3. ✅ Test manual SMS sending
4. ✅ Wait for first automated reminder at 9 AM
5. ✅ Monitor SMS logs
6. ✅ Adjust settings as needed

---

**Happy automating! 🚀**

Your RideReminder SMS system is now ready to keep vehicle owners informed about important document expiry dates.
