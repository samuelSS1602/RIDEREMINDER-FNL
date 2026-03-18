/**
 * SMS Integration Module for RideReminder
 * Handles sending SMS notifications to vehicle owners
 */

// Initialize Firebase Cloud Functions
let smsFunctions = null;

async function initializeSMS() {
    try {
        smsFunctions = firebase.functions();
        console.log('SMS functions initialized');
    } catch (error) {
        console.error('Failed to initialize SMS functions:', error);
    }
}

/**
 * Send SMS to a single vehicle owner
 * @param {Object} vehicle - Vehicle object containing phone number and details
 * @param {string} customMessage - Optional custom message, if not provided uses default
 */
async function sendSMSToVehicle(vehicle, customMessage = null) {
    try {
        if (!smsFunctions) {
            throw new Error('SMS functions not initialized');
        }

        if (!vehicle || !vehicle.mobileNumber) {
            showToast('Invalid vehicle data or phone number', 'error');
            return false;
        }

        // Show loading state
        const smsBtn = event.target.closest('.sms-btn');
        if (smsBtn) {
            smsBtn.disabled = true;
            smsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        // Generate message if not provided
        const message = customMessage || generateSMSMessage(vehicle);

        // Call Cloud Function
        const sendSMS = smsFunctions.httpsCallable('sendSMSToVehicle');
        const response = await sendSMS({
            phoneNumber: vehicle.mobileNumber,
            message: message,
            vehicleId: vehicle.id
        });

        if (response.data.success) {
            showToast('SMS sent successfully!', 'success');
            return true;
        } else {
            showToast('Failed to send SMS', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        showToast(`Error: ${error.message}`, 'error');
        return false;
    } finally {
        // Reset button state
        const smsBtn = event.target?.closest('.sms-btn');
        if (smsBtn) {
            smsBtn.disabled = false;
            smsBtn.innerHTML = '<i class="fas fa-sms"></i>';
        }
    }
}

/**
 * Send bulk SMS to multiple vehicles
 * @param {Array} vehicleIds - Array of vehicle IDs
 * @param {string} message - Message to send
 */
async function sendBulkSMS(vehicleIds, message) {
    try {
        if (!smsFunctions) {
            throw new Error('SMS functions not initialized');
        }

        if (!vehicleIds || vehicleIds.length === 0) {
            showToast('No vehicles selected', 'error');
            return false;
        }

        // Confirm bulk send
        const confirmed = confirm(
            `You are about to send SMS to ${vehicleIds.length} vehicles. Continue?`
        );

        if (!confirmed) {
            return false;
        }

        // Show loading state
        showToast('Sending bulk SMS...', 'info');

        // Call Cloud Function
        const bulkSMS = smsFunctions.httpsCallable('sendBulkSMS');
        const response = await bulkSMS({
            vehicleIds: vehicleIds,
            message: message
        });

        if (response.data.success) {
            const successCount = response.data.results.filter(r => r.success).length;
            showToast(
                `Bulk SMS completed: ${successCount}/${vehicleIds.length} sent successfully`,
                'success'
            );
            return true;
        } else {
            showToast('Bulk SMS process encountered errors', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error in bulk SMS:', error);
        showToast(`Error: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Generate default SMS message for vehicle
 * @param {Object} vehicle - Vehicle object
 * @returns {string} Formatted message
 */
function generateSMSMessage(vehicle) {
    const expiringDocs = getExpiringDocuments(vehicle);
    
    const message = 
        `Hi ${vehicle.customerName},\n\n` +
        `This is a reminder regarding your vehicle ${vehicle.vehicleNumber}.\n\n` +
        `The following documents are approaching expiry:\n\n` +
        `${expiringDocs}\n\n` +
        `Please renew them at the earliest.\n\n` +
        `Thank you!\nSri Balaji Driving School\n` +
        `Palani. Contact: 9842816621`;

    return message;
}

/**
 * Open SMS composer modal
 * @param {Object} vehicle - Vehicle object
 */
function openSMSComposer(vehicle) {
    const modal = document.getElementById('smsComposerModal');
    if (!modal) {
        createSMSComposerModal();
    }

    const messageField = document.getElementById('smsMessage');
    const vehicleField = document.getElementById('smsVehicleId');
    const customerField = document.getElementById('smsCustomer');
    const phoneField = document.getElementById('smsPhone');

    if (messageField) {
        messageField.value = generateSMSMessage(vehicle);
    }
    if (vehicleField) vehicleField.value = vehicle.id;
    if (customerField) customerField.value = vehicle.customerName;
    if (phoneField) phoneField.value = vehicle.mobileNumber;

    const updatedModal = document.getElementById('smsComposerModal');
    if (updatedModal) {
        updatedModal.style.display = 'flex';
    }
}

/**
 * Close SMS composer modal
 */
function closeSMSComposer() {
    const modal = document.getElementById('smsComposerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Send SMS from composer
 */
async function sendSMSFromComposer() {
    try {
        const vehicleId = document.getElementById('smsVehicleId').value;
        const message = document.getElementById('smsMessage').value;
        const phoneNumber = document.getElementById('smsPhone').value;

        if (!message || message.trim().length === 0) {
            showToast('Message cannot be empty', 'error');
            return;
        }

        // Show loading state
        const sendBtn = event.target;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        // Call Cloud Function
        const sendSMS = smsFunctions.httpsCallable('sendSMSToVehicle');
        const response = await sendSMS({
            phoneNumber: phoneNumber,
            message: message,
            vehicleId: vehicleId
        });

        if (response.data.success) {
            showToast('SMS sent successfully!', 'success');
            closeSMSComposer();
        } else {
            showToast('Failed to send SMS', 'error');
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        const sendBtn = event.target;
        sendBtn.disabled = false;
        sendBtn.innerHTML = 'Send SMS';
    }
}

/**
 * Create SMS Composer Modal
 */
function createSMSComposerModal() {
    const modal = document.createElement('div');
    modal.id = 'smsComposerModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content sms-modal">
            <div class="modal-header">
                <h3>Send SMS</h3>
                <button onclick="closeSMSComposer()" class="modal-close">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="form-group">
                    <label>Customer Name</label>
                    <input type="text" id="smsCustomer" class="form-input" disabled>
                </div>
                
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="text" id="smsPhone" class="form-input" disabled>
                </div>
                
                <div class="form-group">
                    <label>Message</label>
                    <textarea id="smsMessage" class="form-input textarea" rows="8" placeholder="Enter SMS message"></textarea>
                    <small class="char-count">
                        <span id="charCount">0</span>/160 characters
                    </small>
                </div>
                
                <input type="hidden" id="smsVehicleId">
            </div>
            
            <div class="modal-footer">
                <button onclick="closeSMSComposer()" class="btn btn-secondary">Cancel</button>
                <button onclick="sendSMSFromComposer()" class="btn btn-primary">Send SMS</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Character counter
    const messageField = document.getElementById('smsMessage');
    if (messageField) {
        messageField.addEventListener('input', function() {
            document.getElementById('charCount').textContent = this.value.length;
        });
    }

    // Close on background click
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSMSComposer();
        }
    });
}

/**
 * Show SMS logs for debugging
 */
async function showSMSLogs() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            showToast('Please login first', 'error');
            return;
        }

        const logsSnapshot = await db.collection('smsLogs')
            .where('userId', '==', user.uid)
            .orderBy('sentAt', 'desc')
            .limit(20)
            .get();

        const logs = logsSnapshot.docs.map(doc => doc.data());
        
        console.table(logs);
        showToast('SMS logs displayed in console', 'info');
    } catch (error) {
        console.error('Error fetching SMS logs:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Initialize SMS when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSMS);
} else {
    initializeSMS();
}
