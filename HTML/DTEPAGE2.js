// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCoR3Bz7w4udNv9KQDstID8R0n0za5t9Fw",
    authDomain: "ridereminder-3a89c.firebaseapp.com",
    projectId: "ridereminder-3a89c",
    storageBucket: "ridereminder-3a89c.firebasestorage.app",
    messagingSenderId: "80786513038",
    appId: "1:80786513038:web:e7ad093305dffd70d5bddf",
    measurementId: "G-GLRPTCH4NE"
};


firebase.initializeApp(firebaseConfig);


const db = firebase.firestore();
const auth = firebase.auth();


auth.onAuthStateChanged(user => {
    if (!user) {
        
        window.location.href = "index.html";
    }
});


const vehicleForm = document.getElementById("vehicleForm");
const boardTypeSelect = document.getElementById("boardType");
const vehicleCategorySelect = document.getElementById("vehicleCategory");
const vehicleNumberInput = document.getElementById("vehicleNumber");
const customerNameInput = document.getElementById("customerName");
const mobileNumberInput = document.getElementById("mobileNumber");
const permitDateInput = document.getElementById("permitDate");
const fcDateInput = document.getElementById("fcDate");
const icDateInput = document.getElementById("icDate");
const taxDateInput = document.getElementById("taxDate");
const greenTaxDateInput = document.getElementById("greenTaxDate");


function toggleFormFields() {
    const selectedBoardType = boardTypeSelect.value;
    const tBoardFields = document.querySelectorAll('.t-board-field');
    const ownBoardFields = document.querySelectorAll('.own-board-field');

    if (selectedBoardType === 't-board') {
        tBoardFields.forEach(field => field.style.display = 'block');
        ownBoardFields.forEach(field => field.style.display = 'block');
    } else if (selectedBoardType === 'own-board') {
        tBoardFields.forEach(field => field.style.display = 'none');
        ownBoardFields.forEach(field => field.style.display = 'block');
    }
}

// Add board type change event listener
boardTypeSelect.addEventListener('change', toggleFormFields);

// Notification Popup function
function showNotificationPopup(message, type) {
    const popup = document.getElementById("notificationPopup");
    if (!popup) return;
    
    const title = popup.querySelector("h3");
    const text = popup.querySelector("p");
    
    title.textContent = type === "success" ? "Success" : "Error";
    title.style.color = type === "success" ? "#16a34a" : "#dc2626";
    text.textContent = message;
    
    popup.style.display = "block";
}

function closeNotificationPopup() {
    document.getElementById("notificationPopup").style.display = "none";
}

function resetForm() {
    vehicleForm.reset();
    toggleFormFields();
}

function validateDates() {
    const today = new Date();
    const dateInputs = [permitDateInput, fcDateInput, icDateInput, taxDateInput, greenTaxDateInput];
    
    return dateInputs.every(input => {
        if (!input || !input.value) return true;
        return new Date(input.value) >= today;
    });
}

// Format verification message for confirmation
function formatVerificationMessage(vehicleData) {
    let message = "📋 PLEASE VERIFY YOUR VEHICLE DETAILS:\n\n";
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📌 BOARD TYPE: ${vehicleData.boardType === 't-board' ? 'T-BOARD' : 'OWN BOARD'}\n`;
    
    // Format vehicle category
    const categoryMap = {
        'car': 'CAR',
        'bike': 'BIKE',
        'van-bus': 'VAN/BUS',
        'tipper-lorry': 'TIPPER/LORRY'
    };
    message += `🚗 VEHICLE CATEGORY: ${categoryMap[vehicleData.vehicleCategory] || 'N/A'}\n`;
    
    message += `🔢 VEHICLE NUMBER: ${vehicleData.vehicleNumber}\n`;
    message += `👤 CUSTOMER NAME: ${vehicleData.customerName}\n`;
    message += `📱 MOBILE NUMBER: ${vehicleData.mobileNumber}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `📅 DOCUMENT DATES:\n`;
    if (vehicleData.fcDate) message += `  ✓ FC DATE: ${vehicleData.fcDate}\n`;
    if (vehicleData.icDate) message += `  ✓ IC DATE: ${vehicleData.icDate}\n`;
    if (vehicleData.permitDate) message += `  ✓ PERMIT DATE: ${vehicleData.permitDate}\n`;
    if (vehicleData.taxDate) message += `  ✓ TAX DATE: ${vehicleData.taxDate}\n`;
    if (vehicleData.greenTaxDate) message += `  ✓ GREEN TAX DATE: ${vehicleData.greenTaxDate}\n`;
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `\n✅ Click OK to SAVE\n❌ Click CANCEL to EDIT`;
    
    return message;
}

// Form submission handler
vehicleForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user) {
            showNotificationPopup("Please log in to add vehicle details", "error");
            return;
        }

        // Validate all dates before proceeding
        if (!validateAllDates()) {
            return; // Stop if any date is invalid
        }

        // Create vehicle data object
        const vehicleData = {
            userId: user.uid,  // Important: Add user ID
            boardType: boardTypeSelect.value,
            vehicleCategory: vehicleCategorySelect.value,
            vehicleNumber: vehicleNumberInput.value.trim().toUpperCase(),
            mobileNumber: mobileNumberInput.value.trim(),
            customerName: customerNameInput.value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add optional dates based on board type
        if (boardTypeSelect.value === 't-board') {
            if (permitDateInput.value) vehicleData.permitDate = permitDateInput.value;
            if (fcDateInput.value) vehicleData.fcDate = fcDateInput.value;
            if (icDateInput.value) vehicleData.icDate = icDateInput.value;
            if (taxDateInput.value) vehicleData.taxDate = taxDateInput.value;
            if (greenTaxDateInput.value) vehicleData.greenTaxDate = greenTaxDateInput.value;
        } else {
            if (fcDateInput.value) vehicleData.fcDate = fcDateInput.value;
            if (icDateInput.value) vehicleData.icDate = icDateInput.value;
        }

        // Verify details before saving
        const verificationMessage = formatVerificationMessage(vehicleData);
        if (!confirm(verificationMessage)) {
            showNotificationPopup("Vehicle details not saved", "info");
            return;
        }

        // Check for duplicate vehicle number
        const existingVehicles = await db.collection("vehicles")
            .where("vehicleNumber", "==", vehicleData.vehicleNumber)
            .where("userId", "==", user.uid)
            .get();

        if (!existingVehicles.empty) {
            showNotificationPopup("Vehicle number already exists in your records", "error");
            return;
        }

        // Add vehicle to Firestore
        await db.collection("vehicles").add(vehicleData);
        
        showNotificationPopup("Vehicle details added successfully!", "success");
        resetForm();
        
        // Optional: Redirect to vehicle list page after short delay
        setTimeout(() => {
            window.location.href = './VEHPAGE.html';
        }, 2000);

    } catch (error) {
        console.error("Error adding vehicle:", error);
        showNotificationPopup(
            `Error: ${error.message || 'Failed to add vehicle'}`, 
            "error"
        );
    }
});

// Add input validation for dates - only validate on submit, not while typing
function validateAllDates() {
    const dateInputs = [
        { input: permitDateInput, name: 'PERMIT' },
        { input: fcDateInput, name: 'FC' },
        { input: icDateInput, name: 'IC' },
        { input: taxDateInput, name: 'TAX' },
        { input: greenTaxDateInput, name: 'GREEN TAX' }
    ];
    
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayDateNum = todayYear * 10000 + todayMonth * 100 + todayDay;
    
    for (let item of dateInputs) {
        const dateInput = item.input;
        if (dateInput && dateInput.value) {
            const [year, month, day] = dateInput.value.split('-').map(Number);
            const selectedDateNum = year * 10000 + month * 100 + day;
            
            if (selectedDateNum < todayDateNum) {
                showNotificationPopup(`${item.name} date cannot be in the past`, "error");
                return false; // Validation failed
            }
        }
    }
    return true; // All dates are valid
}

// Initialize form fields visibility
toggleFormFields();

// Add error handling for auth state
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    console.log("User authenticated:", user.uid);
});