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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();

// Add this at the beginning of your file
auth.onAuthStateChanged(user => {
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = "index.html";
    }
});

// Get form elements
const vehicleForm = document.getElementById("vehicleForm");
const boardTypeSelect = document.getElementById("boardType");
const vehicleNumberInput = document.getElementById("vehicleNumber");
const customerNameInput = document.getElementById("customerName");
const mobileNumberInput = document.getElementById("mobileNumber");
const permitDateInput = document.getElementById("permitDate");
const fcDateInput = document.getElementById("fcDate");
const icDateInput = document.getElementById("icDate");
const taxDateInput = document.getElementById("taxDate");
const greenTaxDateInput = document.getElementById("greenTaxDate");
const statusInput = document.getElementById("status");

// Function to toggle form fields based on board type
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

// Form submission handler
vehicleForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user) {
            showNotificationPopup("Please log in to add vehicle details", "error");
            return;
        }

        // Create vehicle data object
        const vehicleData = {
            userId: user.uid,  // Important: Add user ID
            boardType: boardTypeSelect.value,
            vehicleNumber: vehicleNumberInput.value.trim().toUpperCase(),
            mobileNumber: mobileNumberInput.value.trim(),
            customerName: customerNameInput.value.trim(),
            status: statusInput.value,
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

// Add input validation for dates
[permitDateInput, fcDateInput, icDateInput, taxDateInput, greenTaxDateInput].forEach(dateInput => {
    if (dateInput) { // Check if the input exists
        dateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const today = new Date();
            
            if (selectedDate < today) {
                showNotificationPopup(`${this.id.replace('Date', '').toUpperCase()} date cannot be in the past`, "error");
                this.value = '';
            }
        });
    }
});

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