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

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchTable);
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterByStatus);
    }

    const boardTypeFilter = document.getElementById('boardTypeFilter');
    if (boardTypeFilter) {
        boardTypeFilter.addEventListener('change', filterByBoardType);
    }
}

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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
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

    // Check all relevant documents
    checkDocument(vehicle.permitDate, 'Permit', 'பெர்மிட்');
    checkDocument(vehicle.fcDate, 'FC', 'FC');
    checkDocument(vehicle.icDate, 'Insurance', 'இன்சூரன்ஸ்');
    checkDocument(vehicle.taxDate, 'Tax', 'டாக்ஸ்');
    checkDocument(vehicle.greenTaxDate, 'Green Tax', 'கிரீன் டாக்ஸ்');

    return documents.join('\n');
}

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

// Add this as a global function outside displayVehicles
function getBoardType(type) {
    switch(type) {
        case 'o-board': return 'OWN BOARD';
        case 't-board': return 'TRANSPORT BOARD';
        default: return 'N/A';
    }
}

// Update the displayVehicles function
function displayVehicles(vehicles) {
    const tableBody = document.getElementById("table-body");
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    vehicles.forEach((vehicle, index) => {
        const status = calculateStatus(vehicle);
        const row = document.createElement('tr');
        const isOwnBoard = vehicle.boardType === 'o-board';
        
        // Capitalize the customer name
        const capitalizedName = vehicle.customerName ? 
            vehicle.customerName.toUpperCase() : 'N/A';
        
        // Create a safe version of the vehicle object with capitalized values
        const safeVehicle = {
            customerName: capitalizedName,
            vehicleNumber: vehicle.vehicleNumber?.toUpperCase() || '',
            mobileNumber: vehicle.mobileNumber || '',
            boardType: getBoardType(vehicle.boardType), // Using the global function
            permitDate: vehicle.permitDate || '',
            fcDate: vehicle.fcDate || '',
            icDate: vehicle.icDate || '',
            taxDate: vehicle.taxDate || '',
            greenTaxDate: vehicle.greenTaxDate || ''
        };

        // Safely encode vehicle data for WhatsApp button
        const safeVehicleString = encodeURIComponent(JSON.stringify(safeVehicle));
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${vehicle.vehicleNumber?.toUpperCase() || 'N/A'}</td>
            <td>${getBoardType(vehicle.boardType)}</td>
            <td>${vehicle.mobileNumber || 'N/A'}</td>
            <td>${capitalizedName}</td>
            <td>${isOwnBoard ? '-' : formatDate(vehicle.permitDate)}</td>
            <td>${formatDate(vehicle.fcDate) || '-'}</td>
            <td>${formatDate(vehicle.icDate) || '-'}</td>
            <td>${isOwnBoard ? '-' : formatDate(vehicle.taxDate)}</td>
            <td>${isOwnBoard ? '-' : formatDate(vehicle.greenTaxDate)}</td>
            <td>
                <span class="status-badge ${status.toLowerCase()}">${status}</span>
            </td>
            <td class="action-buttons">
                <button onclick="editVehicle('${vehicle.id}')" class="edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteVehicle('${vehicle.id}')" class="delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
                ${vehicle.mobileNumber ? `
                    <button onclick="sendWhatsAppMessage(JSON.parse(decodeURIComponent('${safeVehicleString}')))"
                            class="whatsapp-btn" 
                            title="Send WhatsApp Message">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateDashboardStats(vehicles) {
    const totalVehicles = document.getElementById('totalVehicles');
    if (totalVehicles) {
        totalVehicles.textContent = vehicles.length;
    }

    const stats = vehicles.reduce((acc, vehicle) => {
        const status = calculateStatus(vehicle);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

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

    const expiringCount = document.getElementById('expiringCount');
    if (expiringCount) {
        expiringCount.textContent = stats['Expiring Soon'] || 0;
    }
}

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
            const boardType = cells[2].textContent;
            row.style.display = 
                selectedType === 'all' || boardType === selectedType ? '' : 'none';
        }
    }
}

function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = './index.html';
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
}

function goToAddVehicle() {
    window.location.href = './DTEPAGE2.html';
}

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
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeFirebase();
        setupAuthStateObserver();
        setupEventListeners();
    } catch (error) {
        console.error("Application initialization error:", error);
        alert("Error initializing application. Please refresh the page.");
    }
});

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger reflow
    toast.offsetHeight;
    
    // Add show class for animation
    toast.classList.add('show');
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Error handling for edit and delete operations
async function editVehicle(vehicleId) {
    try {
        if (!vehicleId) {
            throw new Error('Vehicle ID is required');
        }
        // Store the vehicle ID in sessionStorage for the edit page
        sessionStorage.setItem('editVehicleId', vehicleId);
        window.location.href = './DTEPAGE2.html';
    } catch (error) {
        console.error('Edit vehicle error:', error);
        showToast('Error opening edit page', 'error');
    }
}

async function deleteVehicle(vehicleId) {
    try {
        if (!vehicleId) {
            throw new Error('Vehicle ID is required');
        }

        if (!confirm('Are you sure you want to delete this vehicle?')) {
            return;
        }

        await db.collection('vehicles').doc(vehicleId).delete();
        showToast('Vehicle deleted successfully', 'success');
        
        // Refresh the vehicle list
        const user = auth.currentUser;
        if (user) {
            fetchAndDisplayVehicles(user.uid);
        }
    } catch (error) {
        console.error('Delete vehicle error:', error);
        showToast('Error deleting vehicle', 'error');
    }
}

function calculateStatus(vehicle) {
    const today = new Date();
    const warningDays = 30; // Days before expiry to show warning

    // Get all applicable dates based on board type
    let dates = [];
    if (vehicle.boardType === 'o-board') {
        // Own board: only check FC and Insurance
        dates = [vehicle.fcDate, vehicle.icDate];
    } else {
        // Transport board: check all dates
        dates = [
            vehicle.permitDate,
            vehicle.fcDate,
            vehicle.icDate,
            vehicle.taxDate,
            vehicle.greenTaxDate
        ];
    }

    // Filter out null/undefined dates
    const validDates = dates.filter(date => date);
    
    // If no valid dates, consider it active
    if (!validDates.length) return 'Active';

    // Convert all dates to Date objects and find earliest expiry
    const expiryDates = validDates.map(date => new Date(date));
    const earliestExpiry = new Date(Math.min(...expiryDates));

    // Calculate days until earliest expiry
    const daysUntilExpiry = Math.ceil((earliestExpiry - today) / (1000 * 60 * 60 * 24));

    // Determine status based on days until expiry
    if (daysUntilExpiry < 0) {
        return 'Expired';
    } else if (daysUntilExpiry <= warningDays) {
        return 'Expiring Soon';
    } else {
        return 'Active';
    }
}