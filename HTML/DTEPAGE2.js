const vehicleForm = document.getElementById("vehicleForm");
const vehicleNumberInput = document.getElementById("vehicleNumber");
const customerNameInput = document.getElementById("customerName");
const mobileNumberInput = document.getElementById("mobileNumber");
const permitDateInput = document.getElementById("permitDate");
const fcDateInput = document.getElementById("fcDate");
const icDateInput = document.getElementById("icDate");
const taxDateInput = document.getElementById("taxDate");
const greenTaxDateInput = document.getElementById("greenTaxDate");
const statusInput = document.getElementById("status");

// Notification Popup
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
}

// Validate required fields
function validateForm(boardType) {
    if (!vehicleNumberInput.value.trim()) return "Vehicle Number is required";
    if (!mobileNumberInput.value.trim()) return "Mobile Number is required";
    if (!customerNameInput.value.trim()) return "Customer Name is required";

    if (boardType === 'own') {
        if (!fcDateInput.value) return "FC Date is required";
        if (!icDateInput.value) return "IC Date is required";
        if (!statusInput.value) return "Status is required";
    }
    return null; // No errors
}

// Board Type Selection Setup
const boardTypeSelect = document.createElement('select');
boardTypeSelect.id = 'boardType';
boardTypeSelect.innerHTML = `
    <option value="">Select Board Type</option>
    <option value="own">Own Board</option>
    <option value="t">T Board</option>
`;
boardTypeSelect.required = true;

// Find first input group to insert board type
const firstInputGroup = document.querySelector('.form-grid .input-group');
const boardTypeInputGroup = document.createElement('div');
boardTypeInputGroup.className = 'input-group';
boardTypeInputGroup.innerHTML = `
    <label for="boardType">
        <i class="fas fa-road"></i>
        BOARD TYPE
    </label>
`;
boardTypeInputGroup.appendChild(boardTypeSelect);
firstInputGroup.parentNode.insertBefore(boardTypeInputGroup, firstInputGroup);

// Fields to manage for Own Board
const ownBoardFields = [
    vehicleNumberInput.closest('.input-group'),
    mobileNumberInput.closest('.input-group'),
    customerNameInput.closest('.input-group'),
    fcDateInput.closest('.input-group'),
    icDateInput.closest('.input-group'),
    statusInput.closest('.input-group')
];

// Fields to hide for T Board
const fieldsToHide = [
    permitDateInput.closest('.input-group'),
    taxDateInput.closest('.input-group'),
    greenTaxDateInput.closest('.input-group')
];

// Board Type Change Event
boardTypeSelect.addEventListener('change', function () {
    if (this.value === 'own') {
        // Show fields for Own Board
        ownBoardFields.forEach(field => field.style.display = '');
        fieldsToHide.forEach(field => field.style.display = 'none');
    } else if (this.value === 't') {
        // Show all fields for T Board
        ownBoardFields.forEach(field => field.style.display = '');
        fieldsToHide.forEach(field => field.style.display = '');
    }
});

// Form Submission Handler
vehicleForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        showNotificationPopup("Please log in to add vehicle details", "error");
        return;
    }

    const boardType = boardTypeSelect.value;
    if (!boardType) {
        showNotificationPopup("Please select a board type", "error");
        return;
    }

    // Validate form
    const errorMessage = validateForm(boardType);
    if (errorMessage) {
        showNotificationPopup(errorMessage, "error");
        return;
    }

    const vehicleData = {
        vehicleNumber: vehicleNumberInput.value.trim().toUpperCase(),
        mobileNumber: mobileNumberInput.value.trim(),
        customerName: customerNameInput.value.trim().toUpperCase(),
        boardType: boardType,
        userUid: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (boardType === 'own') {
        vehicleData.fcDate = fcDateInput.value;
        vehicleData.icDate = icDateInput.value;
        vehicleData.status = statusInput.value;
    }

    db.collection("vehicles").add(vehicleData)
        .then(() => {
            showNotificationPopup(`${boardType.toUpperCase()} Board Vehicle details added successfully!`, "success");
            resetForm();
        })
        .catch(error => showNotificationPopup(`Error: ${error.message}`, "error"));
});

// Reset Form to handle board type
function resetForm() {
    vehicleForm.reset();
    boardTypeSelect.value = '';
    ownBoardFields.forEach(field => field.style.display = '');
    fieldsToHide.forEach(field => field.style.display = 'none');
}
