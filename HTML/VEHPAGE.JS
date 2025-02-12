// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCoR3Bz7w4udNv9KQDstID8R0n0za5t9Fw",
    authDomain: "ridereminder-3a89c.firebaseapp.com",
    projectId: "ridereminder-3a89c",
    storageBucket: "ridereminder-3a89c.firebasestorage.app",
    messagingSenderId: "80786513038",
    appId: "1:80786513038:web:e7ad093305dffd70d5bddf",
    measurementId: "G-GLRPTCH4NE"
};

// Firebase Initialization
let auth, db;

async function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Enable offline persistence with error handling
            await db.enablePersistence({ synchronizeTabs: true })
                .catch(err => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence enabled in one tab only.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('Browser does not support persistence.');
                    }
                });
                
            console.log("Firebase initialized successfully");
        }
    } catch (error) {
        console.error("Firebase initialization error:", error);
        throw error;
    }
}

// Add this after initializeFirebase function
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchTable);
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterByStatus);
    }

    // Board type filter
    const boardTypeFilter = document.getElementById('boardTypeFilter');
    if (boardTypeFilter) {
        boardTypeFilter.addEventListener('change', filterByBoardType);
    }
}

// Authentication State Observer
function setupAuthStateObserver() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "./index.html";
            return;
        }
        
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
        fetchAndDisplayVehicles(user.uid);
    });
}

// Utility Functions
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
};

// Vehicle Status Calculation
function calculateStatus(vehicle) {
    const today = new Date();
    const warningDays = 30;

    // Different date checks based on board type
    const dates = vehicle.boardType === 'o-board' ? 
        [vehicle.fcDate, vehicle.icDate] :  // Only FC and Insurance for own board
        [vehicle.permitDate, vehicle.fcDate, vehicle.icDate, vehicle.taxDate, vehicle.greenTaxDate];

    const validDates = dates.filter(Boolean);

    if (!validDates.length) return 'Active';

    const earliestDate = new Date(Math.min(...validDates.map(date => new Date(date))));
    if (earliestDate < today) return 'Expired';

    const daysUntilExpiry = Math.ceil((earliestDate - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= warningDays ? 'Expiring Soon' : 'Active';
}

// WhatsApp Integration
function generateWhatsAppMessage(vehicle) {
    const expiringDocs = getExpiringDocuments(vehicle);
    const message = 
        `அன்பார்ந்த ${vehicle.customerName},\n\n` +
        `இது உங்கள் வாகனம் ${vehicle.vehicleNumber} பற்றிய நினைவூட்டல்.\n\n` +
        `கீழ்கண்ட ஆவணங்களின் காலக்கெடு நெருங்கி வருகிறது:\n\n` +
        `${expiringDocs}\n\n` +
        `தயவுசெய்து உரிய நேரத்தில் புதுப்பித்துக் கொள்ளவும்.\n\n` +
        `நன்றி!,\n` +
        `ஸ்ரீ பாலாஜி ஓட்டுநர் பள்ளி,\n` +
        `பழனி.\n\n` +
        `தொடர்புக்கு: 9842816621`;

    return encodeURIComponent(message);
}

function getExpiringDocuments(vehicle, warningDays = 30) {
    const today = new Date();
    const documents = [];
    
    const checkDocument = (date, name, tamilName) => {
        if (!date) return;
        const expiryDate = new Date(date);
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= warningDays) {
            const status = daysUntil <= 0 ? 
                'காலாவதியாகிவிட்டது' : 
                `${daysUntil} நாட்கள் மட்டுமே உள்ளன`;
            documents.push(`${tamilName}: ${formatDate(date)} (${status})`);
        }
    };

    checkDocument(vehicle.permitDate, 'Permit', 'பெர்மிட்');
    checkDocument(vehicle.fcDate, 'FC', 'FC');
    checkDocument(vehicle.icDate, 'Insurance', 'இன்சூரன்ஸ்');
    checkDocument(vehicle.taxDate, 'Tax', 'டாக்ஸ்');
    checkDocument(vehicle.greenTaxDate, 'Green Tax', 'கிரீன் டாக்ஸ்');

    return documents.join('\n');
}

// Add this function to handle WhatsApp message sending
function sendWhatsAppMessage(vehicle) {
    try {
        if (!vehicle || !vehicle.mobileNumber) {
            showToast('தொலைபேசி எண் கிடைக்கவில்லை', 'error');
            return;
        }

        const message = generateWhatsAppMessage(vehicle);
        const formattedNumber = formatPhoneNumber(vehicle.mobileNumber);
        const whatsappURL = `https://wa.me/${formattedNumber}?text=${message}`;
        window.open(whatsappURL, '_blank');
    } catch (error) {
        console.error('WhatsApp message error:', error);
        showToast('செய்தி அனுப்புவதில் பிழை', 'error');
    }
}

// Data Operations
async function fetchAndDisplayVehicles(userId) {
    if (!userId) {
        console.error("No userId provided");
        return;
    }

    const tableBody = document.getElementById("table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "<tr><td colspan='12' class='text-center'>Loading...</td></tr>";

    try {
        const snapshot = await db.collection("vehicles")
            .where("userId", "==", userId)
            .orderBy("vehicleNumber", "asc")
            .get();

        const vehicles = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (!vehicles.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan='12' class='text-center'>
                        No vehicles found. <a href="./DTEPAGE2.html" class="text-blue-600 hover:underline">Add a vehicle</a>
                    </td>
                </tr>`;
            return;
        }

        displayVehicles(vehicles);
        updateDashboardStats(vehicles);
        
        const recordCount = document.getElementById('recordCount');
        if (recordCount) {
            recordCount.textContent = `${vehicles.length} records`;
        }

    } catch (error) {
        console.error("Error fetching vehicles:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan='12' class='text-center text-red-600'>
                    Error loading vehicles. Please try refreshing the page.
                </td>
            </tr>`;
    }
}

// Update the existing displayVehicles function
function displayVehicles(vehicles) {
    const tableBody = document.getElementById("table-body");
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    vehicles.forEach((vehicle, index) => {
        const status = calculateStatus(vehicle);
        const row = document.createElement('tr');
        const isOwnBoard = vehicle.boardType === 'o-board';
        
        // Safely stringify the vehicle object for the onclick handler
        const safeVehicleString = JSON.stringify(vehicle)
            .replace(/"/g, '&quot;')
            .replace(/'/g, "\\'");
            
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${vehicle.vehicleNumber || 'N/A'}</td>
            <td>${vehicle.boardType || 'N/A'}</td>
            <td>${vehicle.mobileNumber || 'N/A'}</td>
            <td>${vehicle.customerName || 'N/A'}</td>
            <td>${isOwnBoard ? 'N/A' : formatDate(vehicle.permitDate)}</td>
            <td>${formatDate(vehicle.fcDate)}</td>
            <td>${formatDate(vehicle.icDate)}</td>
            <td>${isOwnBoard ? 'N/A' : formatDate(vehicle.taxDate)}</td>
            <td>${isOwnBoard ? 'N/A' : formatDate(vehicle.greenTaxDate)}</td>
            <td>
                <span class="status-badge ${status.toLowerCase()}">${status}</span>
            </td>
            <td class="action-buttons">
                <button onclick="editVehicle('${vehicle.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteVehicle('${vehicle.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
                ${status === 'Expiring Soon' ? `
                <button onclick='sendWhatsAppMessage(${safeVehicleString})'
                        class="whatsapp-btn" title="Send WhatsApp Reminder">
                    <i class="fab fa-whatsapp"></i>
                </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Add dashboard stats update function
function updateDashboardStats(vehicles) {
    // Update total vehicles count
    const totalVehicles = document.getElementById('totalVehicles');
    if (totalVehicles) {
        totalVehicles.textContent = vehicles.length;
    }

    // Count vehicles by status
    const stats = vehicles.reduce((acc, vehicle) => {
        const status = calculateStatus(vehicle);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    // Update status counts
    const activeVehicles = document.getElementById('activeVehicles');
    if (activeVehicles) {
        activeVehicles.textContent = stats['Active'] || 0;
    }

    const expiringSoon = document.getElementById('expiringSoon');
    if (expiringSoon) {
        expiringSoon.textContent = stats['Expiring Soon'] || 0;
    }

    const expired = document.getElementById('expired');
    if (expired) {
        expired.textContent = stats['Expired'] || 0;
    }

    // Update notification badge
    const expiringCount = document.getElementById('expiringCount');
    if (expiringCount) {
        expiringCount.textContent = stats['Expiring Soon'] || 0;
    }
}

// Add search functionality
function searchTable() {
    const searchInput = document.getElementById('searchInput');
    const filter = searchInput.value.toUpperCase();
    const tbody = document.getElementById('table-body');
    const rows = tbody.getElementsByTagName('tr');

    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let cell of cells) {
            const text = cell.textContent || cell.innerText;
            if (text.toUpperCase().indexOf(filter) > -1) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}

// Add filter functions
function filterByStatus() {
    const statusFilter = document.getElementById('statusFilter');
    const selectedStatus = statusFilter.value;
    const tbody = document.getElementById('table-body');
    const rows = tbody.getElementsByTagName('tr');

    for (let row of rows) {
        const statusCell = row.querySelector('.status-badge');
        if (statusCell) {
            const status = statusCell.textContent;
            row.style.display = 
                selectedStatus === 'all' || status === selectedStatus ? '' : 'none';
        }
    }
}

function filterByBoardType() {
    const boardTypeFilter = document.getElementById('boardTypeFilter');
    const selectedType = boardTypeFilter.value;
    const tbody = document.getElementById('table-body');
    const rows = tbody.getElementsByTagName('tr');

    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        if (cells.length > 2) {
                selectedType === 'all' || boardType === selectedType ? '' : 'none';
        }
    }
}

// Add logout function
function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = './index.html';
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
}

// Add navigation function
function goToAddVehicle() {
    window.location.href = './DTEPAGE2.html';
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeFirebase();
        setupAuthStateObserver();
        setupEventListeners();
    } catch (error) {
        console.error("Application initialization error:", error);
    }
});

// Export functionality
function exportToExcel() {
    try {
        const table = document.querySelector('.vehicle-table');
        if (!table) throw new Error('Table not found');

        const rows = Array.from(table.querySelectorAll('tr'));
        const csvContent = '\uFEFF' + rows.map(row => {
            return Array.from(row.cells)
                .map(cell => {
                    const content = cell.textContent.replace(/"/g, '""');
                    return /[,"\n]/.test(content) ? `"${content}"` : content;
                })
                .join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vehicle_records_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export error:", error);
        alert("Error exporting data. Please try again.");
    }
}// Update the displayVehicles function with proper string escaping and JSON handling
function displayVehicles(vehicles) {
    const tableBody = document.getElementById("table-body");
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    vehicles.forEach((vehicle, index) => {
        const status = calculateStatus(vehicle);
        const row = document.createElement('tr');
        
        // Safely stringify the vehicle object for the onclick handler
        const safeVehicleString = JSON.stringify(vehicle)
            .replace(/"/g, '&quot;')
            .replace(/'/g, "\\'");
            
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${vehicle.vehicleNumber || 'N/A'}</td>
            <td>${vehicle.boardType || 'N/A'}</td>
            <td>${vehicle.mobileNumber || 'N/A'}</td>
            <td>${vehicle.customerName || 'N/A'}</td>
            <td>${formatDate(vehicle.permitDate)}</td>
            <td>${formatDate(vehicle.fcDate)}</td>
            <td>${formatDate(vehicle.icDate)}</td>
            <td>${formatDate(vehicle.taxDate)}</td>
            <td>${formatDate(vehicle.greenTaxDate)}</td>
            <td>
                <span class="status-badge ${status.toLowerCase()}">${status}</span>
            </td>
            <td class="action-buttons">
                <button onclick="editVehicle('${vehicle.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteVehicle('${vehicle.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
                <button onclick='sendWhatsAppMessage(${safeVehicleString})'
                        class="whatsapp-btn" title="Send WhatsApp Reminder">
                    <i class="fab fa-whatsapp"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}