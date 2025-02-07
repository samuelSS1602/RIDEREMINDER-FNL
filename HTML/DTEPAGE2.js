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

vehicleForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        showNotificationPopup("Please log in to add vehicle details", "error");
        return;
    }

    const vehicleData = {
        vehicleNumber: vehicleNumberInput.value.trim().toUpperCase(),
        mobileNumber: mobileNumberInput.value.trim(),
        customerName: customerNameInput.value.trim().toUpperCase(),
        permitDate: permitDateInput.value || null,
        fcDate: fcDateInput.value || null,
        icDate: icDateInput.value || null,
        taxDate: taxDateInput.value || null,
        greenTaxDate: greenTaxDateInput.value || null,
        status: statusInput.value,
        userUid: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("vehicles").add(vehicleData)
        .then(() => {
            showNotificationPopup("Vehicle details added successfully!", "success");
            resetForm();
        })
        .catch(error => showNotificationPopup(`Error: ${error.message}`, "error"));
});