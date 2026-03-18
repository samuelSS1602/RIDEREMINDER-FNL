const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get your Twilio credentials from environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || functions.config().twilio?.account_sid;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || functions.config().twilio?.auth_token;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || functions.config().twilio?.phone_number;

const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

// Function to send SMS to a single vehicle owner
exports.sendSMSToVehicle = functions.https.onCall(async (data, context) => {
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
        }

        const { phoneNumber, message, vehicleId } = data;

        // Validate input
        if (!phoneNumber || !message) {
            throw new functions.https.HttpsError('invalid-argument', 'Phone number and message are required');
        }

        // Format phone number to international format
        const formattedPhone = phoneNumber.startsWith('+') 
            ? phoneNumber 
            : `+91${phoneNumber}`;

        // Send SMS via Twilio
        const result = await twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: formattedPhone
        });

        // Log SMS sent to Firestore
        await admin.firestore().collection('smsLogs').add({
            userId: context.auth.uid,
            vehicleId: vehicleId,
            phoneNumber: formattedPhone,
            message: message,
            twilioSid: result.sid,
            status: result.status,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: 'SMS sent successfully',
            sid: result.sid,
            status: result.status
        };
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Scheduled function to send automated SMS for expiring documents
exports.sendAutomatedExpiryReminders = functions.pubsub
    .schedule('0 9 * * *') // Run daily at 9 AM IST
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
        try {
            const db = admin.firestore();
            const today = new Date();
            const warningDays = 7; // Send reminders 7 days before expiry
            const reminderDate = new Date(today.getTime() + warningDays * 24 * 60 * 60 * 1000);

            // Fetch all vehicles
            const vehiclesSnapshot = await db.collection('vehicles').get();

            let remindersSent = 0;

            for (const doc of vehiclesSnapshot.docs) {
                const vehicle = doc.data();
                const documents = [];

                // Check each document type
                const documentTypes = [
                    { date: vehicle.permitDate, name: 'Permit' },
                    { date: vehicle.fcDate, name: 'FC' },
                    { date: vehicle.icDate, name: 'Insurance' },
                    { date: vehicle.taxDate, name: 'Tax' },
                    { date: vehicle.greenTaxDate, name: 'Green Tax' }
                ];

                for (const doc of documentTypes) {
                    if (doc.date) {
                        const expiryDate = new Date(doc.date);
                        if (expiryDate <= reminderDate && expiryDate > today) {
                            const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                            documents.push(`${doc.name} - ${daysLeft} days left`);
                        }
                    }
                }

                // Send SMS if documents are expiring soon
                if (documents.length > 0 && vehicle.mobileNumber) {
                    const expireDocList = documents.join('\n\n');
                    const smsMessage = `Hi ${vehicle.customerName},\n\nThis is a reminder that your vehicle ${vehicle.vehicleNumber} has the following documents expiring soon:\n\n${expireDocList}\n\nPlease renew them at the earliest.\n\nThank you!\nSri Balaji Driving School\nPalani. Contact: 9842816621`;

                    try {
                        const formattedPhone = vehicle.mobileNumber.startsWith('+') 
                            ? vehicle.mobileNumber 
                            : `+91${vehicle.mobileNumber}`;

                        const result = await twilioClient.messages.create({
                            body: smsMessage,
                            from: twilioPhoneNumber,
                            to: formattedPhone
                        });

                        // Log SMS sent
                        await db.collection('smsLogs').add({
                            vehicleId: doc.id,
                            phoneNumber: formattedPhone,
                            message: smsMessage,
                            twilioSid: result.sid,
                            status: result.status,
                            type: 'automated_reminder',
                            sentAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        remindersSent++;
                        console.log(`SMS reminder sent to ${vehicle.customerName}`);
                    } catch (smsError) {
                        console.error(`Failed to send SMS to ${vehicle.mobileNumber}:`, smsError);
                    }
                }
            }

            console.log(`Automated reminders function completed. ${remindersSent} reminders sent.`);
            return { remindersSent };
        } catch (error) {
            console.error('Error in scheduled function:', error);
            return { error: error.message };
        }
    });

// Function to send bulk SMS
exports.sendBulkSMS = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
        }

        const { vehicleIds, message } = data;

        if (!Array.isArray(vehicleIds) || !message) {
            throw new functions.https.HttpsError('invalid-argument', 'vehicleIds array and message are required');
        }

        const db = admin.firestore();
        const results = [];

        for (const vehicleId of vehicleIds) {
            try {
                const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
                
                if (!vehicleDoc.exists) {
                    results.push({
                        vehicleId,
                        success: false,
                        error: 'Vehicle not found'
                    });
                    continue;
                }

                const vehicle = vehicleDoc.data();
                if (!vehicle.mobileNumber) {
                    results.push({
                        vehicleId,
                        success: false,
                        error: 'Phone number not found'
                    });
                    continue;
                }

                const formattedPhone = vehicle.mobileNumber.startsWith('+') 
                    ? vehicle.mobileNumber 
                    : `+91${vehicle.mobileNumber}`;

                const result = await twilioClient.messages.create({
                    body: message,
                    from: twilioPhoneNumber,
                    to: formattedPhone
                });

                await db.collection('smsLogs').add({
                    userId: context.auth.uid,
                    vehicleId: vehicleId,
                    phoneNumber: formattedPhone,
                    message: message,
                    twilioSid: result.sid,
                    status: result.status,
                    type: 'bulk_sms',
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                });

                results.push({
                    vehicleId,
                    success: true,
                    sid: result.sid,
                    status: result.status
                });
            } catch (error) {
                results.push({
                    vehicleId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            message: 'Bulk SMS process completed',
            results: results
        };
    } catch (error) {
        console.error('Error in bulk SMS:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
