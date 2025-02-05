// Check Authentication State
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        document.getElementById('userEmail').textContent = user.email;
        fetchAndDisplayVehicles();
    }
});

// Fetch and Display Vehicles
async function fetchAndDisplayVehicles() {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "<tr><td colspan='11' class='text-center'>Loading...</td></tr>";

    try {
        const snapshot = await db.collection("vehicles").get();
        const vehicles = [];
        snapshot.forEach(doc => {
            vehicles.push({ id: doc.id, ...doc.data() });
        });

        displayVehicles(vehicles);
        updateDashboardStats(vehicles);
    } catch (error) {
        console.error("Error fetching vehicles:", error);
        tableBody.innerHTML = "<tr><td colspan='11' class='text-center text-red-600'>Error loading vehicles</td></tr>";
    }
}

// Display Vehicles in Table
function displayVehicles(vehicles) {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";

    vehicles.forEach((vehicle, index) => {
        const status = calculateStatus(vehicle);
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${vehicle.vehicleNumber}</td>
                <td>${vehicle.mobileNumber}</td>
                <td>${vehicle.customerName}</td>
                <td>${formatDate(vehicle.permitDate)}</td>
                <td>${formatDate(vehicle.fcDate)}</td>
                <td>${formatDate(vehicle.icDate)}</td>
                <td>${formatDate(vehicle.taxDate)}</td>
                <td>${formatDate(vehicle.greenTaxDate)}</td>
                <td>
                    <span class="status-badge ${status.toLowerCase()}">${status}</span>
                </td>
                <td>
                    <button onclick="sendWhatsAppMessage('${vehicle.mobileNumber}', '${vehicle.vehicleNumber}')" 
                            class="whatsapp-btn">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button onclick="editVehicle('${vehicle.id}')" class="action-btn edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteVehicle('${vehicle.id}')" class="action-btn delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// Calculate Vehicle Status
function calculateStatus(vehicle) {
    const today = new Date();
    const dates = [
        new Date(vehicle.permitDate),
        new Date(vehicle.fcDate),
        new Date(vehicle.icDate),
        new Date(vehicle.taxDate),
        new Date(vehicle.greenTaxDate)
    ];

    const nearestDate = dates.reduce((nearest, date) => {
        if (isNaN(date.getTime())) return nearest;
        if (!nearest || date < nearest) return date;
        return nearest;
    });

    if (!nearestDate) return 'Invalid Date';

    const daysUntilExpiry = Math.ceil((nearestDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Expiring Soon';
    return 'Active';
}

// Update Dashboard Statistics
function updateDashboardStats(vehicles) {
    const stats = {
        total: vehicles.length,
        active: 0,
        expiringSoon: 0,
        expired: 0
    };

    vehicles.forEach(vehicle => {
        const status = calculateStatus(vehicle);
        switch (status) {
            case 'Active':
                stats.active++;
                break;
            case 'Expiring Soon':
                stats.expiringSoon++;
                break;
            case 'Expired':
                stats.expired++;
                break;
        }
    });

    document.getElementById('totalVehicles').textContent = stats.total;
    document.getElementById('activeVehicles').textContent = stats.active;
    document.getElementById('expiringSoon').textContent = stats.expiringSoon;
    document.getElementById('expired').textContent = stats.expired;
}

// Send WhatsApp Message
function sendWhatsAppMessage(mobileNumber, vehicleNumber) {
    const formattedNumber = mobileNumber.replace(/\s/g, '');
    const whatsappNumber = formattedNumber.startsWith('+') ? formattedNumber : `+91${formattedNumber}`;
    
    const message = `அன்புள்ள வாடிக்கையாளரே, இது உங்கள் ${vehicleNumber} வாகனத்தைப் பற்றிய நினைவூட்டல். உங்கள் ஆவணம் புதுப்பித்தல் தேதிகளைச் சரிபார்க்கவும்,நன்றி!`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
}

// Search Table
function searchTable() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('table-body').getElementsByTagName('tr');

    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let cell of cells) {
            if (cell.textContent.toLowerCase().includes(searchInput)) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}

// Filter by Status
function filterByStatus() {
    const statusFilter = document.getElementById('statusFilter').value;
    const rows = document.getElementById('table-body').getElementsByTagName('tr');

    for (let row of rows) {
        const statusCell = row.querySelector('.status-badge');
        if (!statusCell) continue;

        const status = statusCell.textContent;
        row.style.display = (statusFilter === 'all' || status === statusFilter) ? '' : 'none';
    }
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN');
}

// Export to Excel
function exportToExcel() {
    const table = document.querySelector('.vehicle-table');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowData = cells.map(cell => `"${cell.textContent.trim().replace(/"/g, '""')}"`);
        csvContent += rowData.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vehicle_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Edit Vehicle
async function editVehicle(vehicleId) {
    try {
        const doc = await db.collection("vehicles").doc(vehicleId).get();
        if (doc.exists) {
            const data = doc.data();
            window.location.href = `edit-vehicle.html?id=${vehicleId}`;
        }
    } catch (error) {
        console.error("Error fetching vehicle:", error);
        alert("Error loading vehicle details");
    }
}

// Delete Vehicle
async function deleteVehicle(vehicleId) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
        await db.collection("vehicles").doc(vehicleId).delete();
        alert("Vehicle deleted successfully");
        fetchAndDisplayVehicles();
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        alert("Error deleting vehicle");
    }
}

// Add New Vehicle
function goToAddVehicle() {
    window.location.href = "DTEPAGE2.HTML";
}

// Logout Function
function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("Error signing out:", error);
            alert("Error signing out");
        });
}
