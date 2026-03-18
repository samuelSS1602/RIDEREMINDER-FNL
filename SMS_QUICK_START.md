# SMS Setup Checklist - Quick Start

Follow this step-by-step checklist to enable SMS notifications in RideReminder.

## ⚙️ Prerequisites
- [ ] Firebase project created and configured
- [ ] Google Cloud account access
- [ ] Node.js and npm installed on your computer
- [ ] Twilio account created

---

## 📱 Twilio Setup (5 minutes)

### Step 1: Create Twilio Account
- [ ] Go to https://www.twilio.com
- [ ] Sign up for trial account ($15 free credit)
- [ ] Verify email and phone number

### Step 2: Get Twilio Credentials
- [ ] Copy **Account SID** from dashboard
- [ ] Copy **Auth Token** from dashboard
- [ ] Note: Account SID, Auth Token

### Step 3: Buy Twilio Number
- [ ] Click "Phone Numbers" → "Manage Numbers"
- [ ] Click "Buy a number"
- [ ] Select country and buy
- [ ] Copy your **Twilio phone number**

**Save these 3 credentials:**
```
Account SID: AC______________________
Auth Token: ________________________
Phone Number: +1________________________
```

---

## 🔥 Firebase Setup (10 minutes)

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Functions
```bash
cd d:\PROGRAM\FINAL DS
firebase init functions
```
- Choose your Firebase project
- Select JavaScript
- Say No to ESLint
- Say Yes to install dependencies

### Step 3: Add Code
- [ ] Copy `sendSMS.js` to `functions/index.js`
- [ ] Delete default Firebase code first

### Step 4: Install Twilio
```bash
cd functions
npm install twilio
```

### Step 5: Set Configuration
From project root, run these commands with **YOUR** credentials:

```bash
firebase functions:config:set twilio.account_sid="ACxxxxxxxxxxxxxxxxxxxxxx"
firebase functions:config:set twilio.auth_token="your_auth_token_here"
firebase functions:config:set twilio.phone_number="+1234567890"
```

### Step 6: Deploy Functions
```bash
firebase deploy --only functions
```

**Wait for deployment to complete** ✅

---

## 🌐 Frontend Setup (5 minutes)

### Files Created
- [ ] `smsStyles.css` - SMS modal styling
- [ ] `smsIntegration.js` - SMS functionality
- [ ] Updated `VEHPAGE.html` - with SMS script links
- [ ] Updated `VEHPAGE.JS` - with SMS button in table

### Verify Updates
Open `VEHPAGE.html` and check:
- [ ] `<link rel="stylesheet" href="./smsStyles.css">` in `<head>`
- [ ] `<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-functions.js"></script>` in `<head>`
- [ ] `<script src="./smsIntegration.js"></script>` before closing `</body>`

---

## ✅ Testing (5 minutes)

### Step 1: Test Manual SMS
1. [ ] Log in to dashboard
2. [ ] Click **SMS button** (📧 icon) on any vehicle row
3. [ ] Modal should open with customer info
4. [ ] Click **Send SMS**
5. [ ] You should see: "SMS sent successfully!"
6. [ ] Check your phone for message

### Step 2: Verify in Twilio
- [ ] Log in to Twilio dashboard
- [ ] Go to "Messages"
- [ ] Verify SMS appears in logs

### Step 3: Check Firebase Logs
```bash
firebase functions:log
```

You should see SMS function calls logged.

---

## 🚀 Automated Reminders (Set & Forget)

### How It Works
- ✅ Runs automatically **every day at 9:00 AM IST**
- ✅ Checks all vehicles for expiring documents
- ✅ Sends SMS if expiring within **7 days**
- ✅ Includes document names and days remaining
- ✅ Logs all messages

### To Change Schedule
Edit `sendSMS.js` in Cloud Functions:
```javascript
.schedule('0 9 * * *')  // Change to your preferred time
```
Then redeploy: `firebase deploy --only functions`

---

## 📊 Features Available

### 1. Manual SMS
- Button in vehicle table row
- Customize message before sending
- 160 character limit per SMS

### 2. Auto Reminders
- Daily scheduled checks
- 7 days before document expiry
- No manual intervention needed

### 3. SMS Logs
- View all sent messages
- Filter by vehicle
- Track delivery status

---

## 🔧 Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| SMS button not showing | Clear cache (Ctrl+Shift+Delete), refresh |
| "Functions not initialized" | Redeploy: `firebase deploy --only functions` |
| SMS not sending | Check Twilio balance, verify phone format |
| No automated reminders | Deploy functions, wait until 9 AM IST |
| Auth errors | Re-login: `firebase login` |

---

## 📞 Support Resources

- **Twilio Help**: https://www.twilio.com/docs/sms
- **Firebase Docs**: https://firebase.google.com/docs/functions
- **Phone Format Guide**: +91 prefix for India numbers

---

## 🎯 Success Criteria

Your SMS setup is **COMPLETE** when:

- ✅ Manual SMS sends successfully
- ✅ Recipient receives message
- ✅ Firebase logs show success
- ✅ SMS button appears in vehicle table
- ✅ Modal opens when clicking SMS button
- ✅ Automated reminders run at 9 AM (or next day)

---

## 📝 Notes

- Twilio trial: $15 = ~240 SMS messages
- Each SMS costs ~$0.0075 after trial
- Firebase free tier: 125,000 invocations/month
- Automated checks use minimal resources

---

**Congratulations! 🎉 Your SMS system is now ready for production.**

Questions? Check the detailed guide in `SMS_SETUP_GUIDE.md`
