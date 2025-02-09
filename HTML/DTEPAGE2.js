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
    popup.querySelector("h3").textContent = type === "success" ? "Success" : "Error";
    popup.querySelector("h3").style.color = type === "success" ? "green" : "red";
    popup.querySelector("p").textContent = message;
    popup.style.display = "block";
}

function closeNotificationPopup() {
    document.getElementById("notificationPopup").style.display = "none";
}

function resetForm() {
    vehicleForm.reset();
    toggleFormFields();
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

        // Create vehicle data with userId
        const vehicleData = {
            userId: user.uid,  // Add this line to include user ID
            boardType: boardTypeSelect.value,
            vehicleNumber: vehicleNumberInput.value.trim().toUpperCase(),
            mobileNumber: mobileNumberInput.value.trim(),
            customerName: customerNameInput.value.trim().toUpperCase(),
            status: statusInput.value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add optional fields based on board type
        if (boardTypeSelect.value === 't-board') {
            vehicleData.permitDate = permitDateInput.value || null;
            vehicleData.fcDate = fcDateInput.value || null;
            vehicleData.icDate = icDateInput.value || null;
            vehicleData.taxDate = taxDateInput.value || null;
            vehicleData.greenTaxDate = greenTaxDateInput.value || null;
        } else {
            vehicleData.fcDate = fcDateInput.value || null;
            vehicleData.icDate = icDateInput.value || null;
        }

        // Check if vehicle number already exists for this user
        const existingVehicle = await db.collection("vehicles")
            .where("vehicleNumber", "==", vehicleData.vehicleNumber)
            .where("userId", "==", user.uid)
            .get();

        if (!existingVehicle.empty) {
            showNotificationPopup("Vehicle number already exists in your records", "error");
            return;
        }

        // Add vehicle to database
        await db.collection("vehicles").add(vehicleData);
        showNotificationPopup("Vehicle details added successfully!", "success");
        resetForm();
        
    } catch (error) {
        console.error("Error adding vehicle:", error);
        showNotificationPopup(`Error: ${error.message}`, "error");
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