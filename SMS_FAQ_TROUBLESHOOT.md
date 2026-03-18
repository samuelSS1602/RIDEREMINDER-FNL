# SMS Integration - Frequently Asked Questions & Troubleshooting

## 🤔 General Questions

### Q: Do I need to write any code?
**A:** No! All code is provided. You just need to:
1. Set up Twilio account
2. Copy provided files
3. Deploy with Firebase
4. All Python/JavaScript code is ready to use

### Q: Will this work on mobile phones?
**A:** Yes! The SMS button works:
- ✅ Desktop browsers
- ✅ Tablet browsers
- ✅ Mobile browsers
- Same functionality everywhere

### Q: How much will SMS cost?
**A:** Typically $0-5 per month:
- **Trial**: $15 free = ~240 SMS
- **After trial**: $0.0075 per SMS
- **100 SMS/month** = ~$0.75
- Within Firebase free tier for functions

### Q: Can I send SMS to international numbers?
**A:** Yes! Twilio supports:
- ✅ Any country with +XXX format
- Different rates per country
- Update price list on Twilio dashboard

### Q: What if I make a mistake with credentials?
**A:** Easy to fix:
```bash
# Update any credential
firebase functions:config:set twilio.phone_number="+1234567890"

# View all config
firebase functions:config:get

# Deploy again
firebase deploy --only functions
```

---

## 🔧 Setup Issues

### Q: "Firebase CLI not found" error
**A:** Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase --version  # Should show version number
```

### Q: "You must authenticate" error
**A:** Log in to Firebase:
```bash
firebase login
# Browser window opens, log in with Google
firebase projects:list  # Verify login worked
```

### Q: Can't find my Firebase project
**A:** Select during setup:
```bash
firebase init functions
# When prompted, choose your project from the list
```

### Q: "PERMISSION_DENIED" error
**A:** Your Firebase project doesn't have Cloud Functions enabled:
1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ Settings → Project Settings
4. Go to "Functions" tab
5. Enable if needed

### Q: Functions not deploying
**A:** Check for errors:
```bash
firebase deploy --only functions
# Read the error message carefully
firebase functions:log  # Check for runtime errors
```

---

## 📱 SMS Not Sending

### Q: Click SMS button, nothing happens
**A:** Check browser console (F12):
1. Press F12 to open Developer Tools
2. Click "Console" tab
3. Look for red error messages
4. Common errors:
   - "SMS functions not initialized"
   - "Auth error"
   - "Network error"

### Q: "SMS functions not initialized"
**A:** Cloud Functions not deployed:
```bash
firebase deploy --only functions
# Wait for completion
# Refresh the dashboard page
```

### Q: "Auth error" or "unauthenticated"
**A:** User not logged in:
1. Verify you're logged into the dashboard
2. Check browser console for Firebase errors
3. Clear cookies: Ctrl+Shift+Delete
4. Log out and log back in

### Q: "Invalid phone number"
**A:** Phone number format issue:
1. Must include country code: `+91XXXXXXXXXX`
2. No spaces or dashes
3. Check Firestore database - verify mobileNumber field
4. Test with known good number

### Q: Sent but never received
**A:** Several possible causes:

1. **Twilio account out of credit**
   - Log into Twilio dashboard
   - Check account balance (need at least $0.01)

2. **Wrong phone number**
   - Verify recipient number format
   - Test with different number

3. **Twilio not configured correctly**
   - Verify all 3 credentials set:
   ```bash
   firebase functions:config:get
   ```
   - Should show all 3 twilio.* values

4. **Number is invalid/blocked**
   - Some regions may block SMS
   - Check Twilio capabilities for that country

### Q: "INVALID_REQUEST_BODY"
**A:** Message too long:
- SMS limited to **160 characters**
- Check character counter in modal
- Edit message to fit limit

### Q: Sent SMS shows as "failed" in logs
**A:** Check Twilio dashboard:
1. Go to https://www.twilio.com
2. Click "Messages"
3. Find the failed message
4. Check error details
5. Common issues:
   - Invalid phone format
   - Number blocked in region
   - Insufficient credit

---

## ⏰ Automated Reminders

### Q: Automated SMS not sending
**A:** Cloud Function not running. Check:
1. Function deployed: `firebase deploy --only functions`
2. Wait until 9 AM IST (next day if just deployed)
3. Check logs: `firebase functions:log`

### Q: Reminders not at expected time
**A:** Time zone issue:
- Scheduled for 9:00 AM **IST (India Standard Time)**
- Check your local time vs IST
- May take 1-2 minutes to execute

### Q: How often do reminders send?
**A:** By default:
- Once per day at 9:00 AM IST
- Only sends if documents expiring within 7 days
- Each vehicle gets one message

### Q: Can I send reminders more often?
**A:** Edit the Cloud Function:
```javascript
// In sendSMS.js
.schedule('0 9 * * *')  // Daily
// Change to:
.schedule('0 9 * * 1')  // Monday only
.schedule('0 */6 * * *')  // Every 6 hours
```

Then redeploy:
```bash
firebase deploy --only functions
```

### Q: Which vehicles get reminders?
**A:** Only vehicles with:
- ✅ Valid mobile number
- ✅ Documents expiring within 7 days
- ✅ Expiry date in the future

---

## 📊 Viewing Logs

### Q: How do I see what SMS were sent?
**A:** Three methods:

**Method 1: Firebase Logs**
```bash
firebase functions:log
# Shows Cloud Function execution logs
```

**Method 2: Browser Console**
```javascript
showSMSLogs()  // Shows SMS logs from current user
```

**Method 3: Firestore Console**
1. Go to https://console.firebase.google.com
2. Select project
3. Firestore Database
4. Collection: "smsLogs"
5. View all SMS records

### Q: Can I see SMS sent by other users?
**A:** No, for privacy:
- Each user only sees own SMS logs
- Firestore rules prevent cross-user access

### Q: How long are logs kept?
**A:** Indefinitely:
- Limited only by Firestore storage
- $0.006 per 100K reads
- Data kept forever by default

---

## 🔐 Security Questions

### Q: Are my credentials safe?
**A:** Yes! Multiple protections:
- Credentials stored in Firebase (not in code)
- Never transmitted to frontend
- Firestore rules enforce user access
- Only authenticated users can send SMS

### Q: Can someone abuse this to send spam?
**A:** No, prevented by:
- Firebase authentication required
- User can only access their own vehicles
- Logged/auditable
- Rate limiting possible to add

### Q: Is my phone data secure?
**A:** Yes:
- Phone numbers only used for SMS sending
- Never shared or stored externally
- Only vehicle owner can trigger SMS
- Firestore rules prevent unauthorized access

### Q: What happens if Twilio account is compromised?
**A:** Limited damage:
- Only can send SMS using your Twilio number
- Can't access Firebase database
- Can rebuild/reset credentials:
```bash
firebase functions:config:unset twilio.account_sid
firebase functions:config:set twilio.account_sid="NEW_SID"
firebase deploy --only functions
```

---

## 💬 Message Questions

### Q: Can I customize the message template?
**A:** Yes! Edit `smsIntegration.js`:
```javascript
function generateSMSMessage(vehicle) {
    return `Your custom message for ${vehicle.customerName}`;
}
```

Then refresh dashboard.

### Q: Can I send in different languages?
**A:** Yes! Example in Tamil:
```javascript
const message = 
    `வணக்கம் ${vehicle.customerName},\n\n` +
    `உங்கள் வாகனம் ${vehicle.vehicleNumber}...`;
```

### Q: Can I include custom variables?
**A:** Yes! Available variables:
```javascript
vehicle.customerName      // "RAJESH"
vehicle.vehicleNumber     // "TN01AB1234"
vehicle.mobileNumber      // "9876543210"
vehicle.permitDate        // "2024-12-31"
vehicle.fcDate            // "2024-11-30"
vehicle.icDate            // "2024-10-31"
vehicle.taxDate           // "2024-09-30"
vehicle.greenTaxDate      // "2024-08-31"
```

### Q: Character limit for SMS?
**A:** 160 characters:
- Standard SMS length
- Counter in modal shows real-time count
- Important for splitting into multiple SMS

### Q: What if message exceeds 160 characters?
**A:** Automatically handled:
- Message split into 2-3 SMS
- Each charged separately by Twilio
- Counter shows total characters

---

## 🐛 Debugging

### Q: SMS button doesn't appear
**A:** Check files exist:
- [ ] `smsStyles.css` - exists?
- [ ] `smsIntegration.js` - exists?
- [ ] CSS linked in `VEHPAGE.html` head?
- [ ] JS linked before `</body>`?

If yes to all:
```bash
# Clear browser cache
Ctrl+Shift+Delete
# Hard refresh
Ctrl+Shift+R
```

### Q: Modal doesn't open
**A:** In browser console (F12):
```javascript
console.log(typeof openSMSComposer)
// Should show: "function"
// If "undefined", script not loaded
```

Solutions:
1. Hard refresh page
2. Check console for JS errors
3. Verify file exists and is referenced

### Q: Can't edit message
**A:** Check textarea:
1. Should be enabled/not grayed out
2. Click inside to focus
3. Type should work
4. Character counter should update

### Q: Send button doesn't respond
**A:** Check button in console:
1. Click button, go to F12 Console
2. Look for errors
3. Common errors:
   - "Firebase not initialized"
   - "User not authenticated"
   - "No phone number"

---

## 📈 Performance Questions

### Q: Will this work with 1000s of vehicles?
**A:** Yes:
- Cloud Functions auto-scale
- Firestore handles millions of records
- SMS sent in batches efficiently
- May take 5-10 minutes for large batches

### Q: What if many users access dashboard?
**A:** Works fine:
- Each user independent
- Cloud Functions handle concurrency
- Firebase auto-scales

### Q: How many SMS can I send per day?
**A:** Twilio limits:
- **Trial**: 100 SMS/day
- **Production**: Typically 1000s/day
- Check your account settings

---

## 🆘 Still Having Issues?

### Step-by-step Debug

1. **Check all files exist:**
   ```bash
   ls functions/sendSMS.js
   ls functions/package.json
   ls HTML/smsIntegration.js
   ls HTML/smsStyles.css
   ```

2. **Verify Firebase project:**
   ```bash
   firebase projects:list
   firebase functions:config:get
   ```

3. **Check function deployment:**
   ```bash
   firebase functions:list
   firebase functions:log
   ```

4. **Test manually:**
   - Click SMS button
   - Open console (F12)
   - Send test SMS
   - Check logs

5. **Check Twilio:**
   - https://www.twilio.com/console
   - Account balance sufficient?
   - Phone number active?
   - Credentials correct?

### If Still Stuck

1. Save all error messages/screenshots
2. Check Firebase logs: `firebase functions:log`
3. Check browser console: F12 → Console tab
4. Compare setup with `SMS_SETUP_GUIDE.md`
5. Ensure ALL steps completed

---

## ✅ Verification Checklist

SMS system is working when:

- [ ] SMS button visible on vehicle row
- [ ] Click button opens modal
- [ ] Modal shows customer name & phone
- [ ] Can type custom message
- [ ] Character counter updates
- [ ] Send button is clickable
- [ ] "SMS sent successfully" message appears
- [ ] SMS received on phone within 30 seconds
- [ ] Firebase shows SMS in logs
- [ ] Twilio dashboard shows message

**If all checked ✅ - You're ready to go!**

---

**Need more help? Consult:**
- SMS_SETUP_GUIDE.md - Detailed setup
- SMS_QUICK_START.md - Quick checklist
- Twilio Docs - SMS API details
- Firebase Docs - Cloud Functions reference

**Good luck! 🚀**
