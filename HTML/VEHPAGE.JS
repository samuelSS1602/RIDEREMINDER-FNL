const firebaseConfig = {
    apiKey: "AIzaSyCoR3Bz7w4udNv9KQDstID8R0n0za5t9Fw",
    authDomain: "ridereminder-3a89c.firebaseapp.com",
    projectId: "ridereminder-3a89c",
    storageBucket: "ridereminder-3a89c.firebasestorage.app",
    messagingSenderId: "80786513038",
    appId: "1:80786513038:web:e7ad093305dffd70d5bddf",
    measurementId: "G-GLRPTCH4NE"
};


let auth, db;

async function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            

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
        // Tamil message
        `அன்பார்ந்த ${vehicle.customerName},\n\n` +
        `இது உங்கள் வாகனம் ${vehicle.vehicleNumber} பற்றிய நினைவூட்டல்.\n\n` +
        `கீழ்கண்ட ஆவணங்களின் காலக்கெடு நெருங்கி வருகிறது:\n\n` +
        `${expiringDocs}\n\n` +
        `தயவுசெய்து உரிய நேரத்தில் புதுப்பித்துக் கொள்ளவும்.\n\n` +
        `நன்றி!,\n` +
        `ஸ்ரீ பாலாஜி ஓட்டுநர் பள்ளி,\n` +
        `பழனி.\n\n` +
        `தொடர்புக்கு: 9842816621\n\n` +
        `--------------------------------\n\n` +
        // English message
        `Dear ${vehicle.customerName},\n\n` +
        `This is a reminder regarding your vehicle ${vehicle.vehicleNumber}.\n\n` +
        `The following documents are approaching expiry:\n\n` +
        `${expiringDocs}\n\n` +
        `Please renew them at the earliest.\n\n` +
        `Thank you!,\n` +
        `Sri Balaji Driving School,\n` +
        `Palani.\n\n` +
        `Contact: 9842816621`;

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

// Get vehicle category display name
function getVehicleCategory(category) {
    switch(category) {
        case 'car': return 'Car';
        case 'bike': return 'Bike';
        case 'van-bus': return 'Van/Bus';
        case 'tipper-lorry': return 'Tipper/Lorry';
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
        
        // Create a safe version of the vehicle object
        const safeVehicle = {
            customerName: capitalizedName,
            vehicleNumber: vehicle.vehicleNumber?.toUpperCase() || '',
            mobileNumber: vehicle.mobileNumber || '',
            boardType: getBoardType(vehicle.boardType),
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
            <td>${getVehicleCategory(vehicle.vehicleCategory)}</td>
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
                <button onclick="openSMSComposer({id: '${vehicle.id}', mobileNumber: '${vehicle.mobileNumber}', customerName: '${capitalizedName}', vehicleNumber: '${vehicle.vehicleNumber?.toUpperCase() || 'N/A'}', permitDate: '${vehicle.permitDate || ''}', fcDate: '${vehicle.fcDate || ''}', icDate: '${vehicle.icDate || ''}', taxDate: '${vehicle.taxDate || ''}', greenTaxDate: '${vehicle.greenTaxDate || ''}'})" 
                        class="sms-btn" 
                        title="Send SMS">
                    <i class="fas fa-sms"></i>
                </button>
                <button onclick="sendWhatsAppMessage(JSON.parse(decodeURIComponent('${safeVehicleString}')))"
                        class="whatsapp-btn" 
                        title="Send WhatsApp Message">
                    <i class="fab fa-whatsapp"></i>
                </button>
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
}// Implement pagination for vehicle data
async function fetchVehiclesWithPagination(userId, lastDoc = null, limit = 20) {
    let query = db.collection("vehicles")
        .where("userId", "==", userId)
        .orderBy("vehicleNumber", "asc")
        .limit(limit);
    
    if (lastDoc) {
        query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    const vehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return { vehicles, lastVisible };
}

// Implement progressive loading on scroll
let lastVisibleDoc = null;
let isLoading = false;

function setupInfiniteScroll() {
    const tableContainer = document.querySelector('.table-wrapper');
    tableContainer.addEventListener('scroll', () => {
        const { scrollTop, scrollHeight, clientHeight } = tableContainer;
        
        if (scrollTop + clientHeight >= scrollHeight - 200 && !isLoading && lastVisibleDoc) {
            isLoading = true;
            
            const loadingRow = document.createElement('tr');
            loadingRow.id = 'loading-row';
            loadingRow.innerHTML = '<td colspan="12" class="text-center">Loading more vehicles...</td>';
            document.getElementById('table-body').appendChild(loadingRow);
            
            fetchVehiclesWithPagination(auth.currentUser.uid, lastVisibleDoc)
                .then(({ vehicles, lastVisible }) => {
                    document.getElementById('loading-row')?.remove();
                    appendVehicles(vehicles);
                    lastVisibleDoc = lastVisible;
                    isLoading = false;
                })
                .catch(error => {
                    console.error("Error loading more vehicles:", error);
                    document.getElementById('loading-row')?.remove();
                    isLoading = false;
                });
        }
    });
}

function appendVehicles(vehicles) {
    // Append vehicles to the existing table without replacing current content
    const tableBody = document.getElementById("table-body");
    const startIndex = tableBody.children.length;
    
    vehicles.forEach((vehicle, index) => {
        // Use same row creation logic as in displayVehicles
        const row = createVehicleRow(vehicle, startIndex + index);
        tableBody.appendChild(row);
    });
}

function createVehicleRow(vehicle, index) {
    // Extract row creation logic from displayVehicles to make it reusable
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
        boardType: getBoardType(vehicle.boardType),
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
            <span class="status-badge ${status.toLowerCase().replace(' ', '-')}">${status}</span>
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
    
    return row;
}// Enhanced network status monitoring
function setupNetworkMonitoring() {
    const networkStatus = document.getElementById('networkStatus');
    const lastSync = document.getElementById('lastSync');
    
    if (!networkStatus || !lastSync) return;
    
    // Initial status
    updateNetworkStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        updateNetworkStatus();
        syncDataWithServer();
    });
    
    window.addEventListener('offline', updateNetworkStatus);
    
    function updateNetworkStatus() {
        const isOnline = navigator.onLine;
        
        networkStatus.innerHTML = isOnline 
            ? '<span class="online-status"><i class="fas fa-wifi"></i> Online</span>' 
            : '<span class="offline-status"><i class="fas fa-exclamation-triangle"></i> Offline - Changes will sync when you reconnect</span>';
        
        networkStatus.className = isOnline ? 'status-online' : 'status-offline';
    }
    
    function syncDataWithServer() {
        // Attempt to sync any pending changes when back online
        lastSync.textContent = `Last synced: ${new Date().toLocaleTimeString()}`;
        
        // Refresh data
        const user = auth.currentUser;
        if (user) {
            fetchAndDisplayVehicles(user.uid);
        }
    }
}

// Add queue for operations while offline
const offlineQueue = [];

async function performAction(actionType, data) {
    try {
        if (!navigator.onLine) {
            // Queue the action for later
            offlineQueue.push({ actionType, data, timestamp: Date.now() });
            localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
            showToast('Action queued for when you\'re back online', 'info');
            return;
        }
        
        // Perform the action immediately if online
        switch (actionType) {
            case 'add':
                await db.collection('vehicles').add(data);
                break;
            case 'update':
                await db.collection('vehicles').doc(data.id).update(data);
                break;
            case 'delete':
                await db.collection('vehicles').doc(data).delete();
                break;
            default:
                throw new Error('Unknown action type');
        }
        
        // Refresh data after successful action
        const user = auth.currentUser;
        if (user) {
            fetchAndDisplayVehicles(user.uid);
        }
        
    } catch (error) {
        console.error(`Error performing ${actionType} action:`, error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Process the offline queue when back online
function processOfflineQueue() {
    if (!navigator.onLine) return;
    
    const queuedActions = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    
    if (queuedActions.length > 0) {
        showToast(`Processing ${queuedActions.length} queued actions...`, 'info');
        
        // Create a copy of the queue and clear storage
        const actionsToProcess = [...queuedActions];
        localStorage.removeItem('offlineQueue');
        offlineQueue.length = 0;
        
        // Process each action
        actionsToProcess.forEach(async ({ actionType, data }) => {
            try {
                await performAction(actionType, data);
            } catch (error) {
                console.error(`Failed to process queued ${actionType}:`, error);
            }
        });
        
        showToast('Queued actions processed successfully', 'success');
    }
}

// Initialize offline support
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('online', processOfflineQueue);
    
    // Check for queued actions on page load
    if (navigator.onLine) {
        processOfflineQueue();
    }
});// Implement dark mode toggle
function setupDarkModeToggle() {
    // Add dark mode toggle to sidebar
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;
    
    const darkModeToggle = document.createElement('a');
    darkModeToggle.href = "#";
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    darkModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');
        
        // Save preference
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        
        // Update icon
        darkModeToggle.innerHTML = isDarkMode 
            ? '<i class="fas fa-sun"></i> Light Mode'
            : '<i class="fas fa-moon"></i> Dark Mode';
    });
    
    // Add to sidebar after other items
    sidebarNav.appendChild(darkModeToggle);
    
    // Load saved preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }
}

// Improve date handling with better validation
function validateAndFormatDate(dateInput, fieldName) {
    if (!dateInput) return null;
    
    try {
        // Attempt to create a valid date object
        const date = new Date(dateInput);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format for ${fieldName}`);
        }
        
        // Format date consistently as ISO string to prevent timezone issues
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error(`Date validation error:`, error);
        showToast(`Invalid date: ${error.message}`, 'error');
        return null;
    }
}

// Add keyboard navigation for table
function setupTableKeyboardNavigation() {
    const table = document.querySelector('.vehicle-table');
    if (!table) return;
    
    // Make table rows focusable
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.setAttribute('tabindex', '0');
        
        // Handle keyboard events
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                // Open edit dialog on Enter or Space
                const editBtn = row.querySelector('.edit-btn');
                if (editBtn) {
                    e.preventDefault();
                    editBtn.click();
                }
            } else if (e.key === 'Delete') {
                // Delete on Delete key
                const deleteBtn = row.querySelector('.delete-btn');
                if (deleteBtn) {
                    e.preventDefault();
                    deleteBtn.click();
                }
            } else if (e.key === 'ArrowDown') {
                // Navigate to next row
                e.preventDefault();
                const nextRow = row.nextElementSibling;
                if (nextRow) nextRow.focus();
            } else if (e.key === 'ArrowUp') {
                // Navigate to previous row
                e.preventDefault();
                const prevRow = row.previousElementSibling;
                if (prevRow) prevRow.focus();
            }
        });
    });
}

// Add print functionality
function setupPrintButton() {
    const tableActions = document.querySelector('.table-actions');
    if (!tableActions) return;
    
    const printButton = document.createElement('button');
    printButton.className = 'print-btn';
    printButton.title = 'Print Records';
    printButton.innerHTML = '<i class="fas fa-print"></i>';
    printButton.addEventListener('click', printVehicleRecords);
    
    tableActions.appendChild(printButton);
}

function printVehicleRecords() {
    // Create a printable version
    const printContent = document.createElement('div');
    const table = document.querySelector('.vehicle-table').cloneNode(true);
    
    // Remove action buttons for printing
    const actionCells = table.querySelectorAll('th:last-child, td:last-child');
    actionCells.forEach(cell => cell.remove());
    
    printContent.innerHTML = `
        <h1>Vehicle Records</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    `;
    printContent.appendChild(table);
    
    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Vehicle Records</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .status-badge {
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 0.875rem;
                    }
                    .active { background-color: #10b981; color: white; }
                    .expiring-soon { background-color: #f59e0b; color: white; }
                    .expired { background-color: #ef4444; color: white; }
                    @media print {
                        h1 { text-align: center; }
                        p { text-align: right; }
                    }
                </style>
            </head>
            <body>
                ${printContent.outerHTML}
                <script>
                    setTimeout(() => { window.print(); window.close(); }, 500);
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}// Enhanced Notification System
function setupNotificationSystem() {
    // Add notification center UI
    const notificationBell = document.querySelector('.notification-bell');
    if (!notificationBell) return;
    
    notificationBell.innerHTML = `
        <i class="fas fa-bell"></i>
        <span class="notification-badge" id="expiringCount">0</span>
    `;
    
    // Create notification panel
    const notificationPanel = document.createElement('div');
    notificationPanel.className = 'notification-panel';
    notificationPanel.innerHTML = `
        <div class="notification-header">
            <h3>Notifications</h3>
            <button id="mark-all-read" class="text-link">Mark all as read</button>
        </div>
        <div class="notification-list" id="notification-list">
            <div class="empty-notifications">No new notifications</div>
        </div>
    `;
    
    // Add to DOM
    notificationBell.appendChild(notificationPanel);
    
    // Toggle notification panel
    notificationBell.addEventListener('click', (e) => {
        if (e.target.closest('#mark-all-read')) {
            // Handle mark all read
            markAllNotificationsAsRead();
            return;
        }
        
        notificationPanel.classList.toggle('show');
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-bell') && notificationPanel.classList.contains('show')) {
            notificationPanel.classList.remove('show');
        }
    });
}

// Check for upcoming expirations
function checkForExpirations() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Get all vehicles
    db.collection("vehicles")
        .where("userId", "==", user.uid)
        .get()
        .then(snapshot => {
            const vehicles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Get notifiable expirations (7, 15, 30 days)
            const notifications = [];
            const today = new Date();
            
            vehicles.forEach(vehicle => {
                // Check each date field
                const dateFields = [
                    { name: 'Permit', date: vehicle.permitDate, applicable: vehicle.boardType !== 'o-board' },
                    { name: 'FC', date: vehicle.fcDate, applicable: true },
                    { name: 'Insurance', date: vehicle.icDate, applicable: true },
                    { name: 'Tax', date: vehicle.taxDate, applicable: vehicle.boardType !== 'o-board' },
                    { name: 'Green Tax', date: vehicle.greenTaxDate, applicable: vehicle.boardType !== 'o-board' }
                ];
                
                dateFields.forEach(field => {
                    if (!field.applicable || !field.date) return;
                    
                    const expiryDate = new Date(field.date);
                    const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                    
                    // Check for specific thresholds
                    if ([7, 15, 30].includes(daysUntil)) {
                        notifications.push({
                            vehicleId: vehicle.id,
                            vehicleNumber: vehicle.vehicleNumber,
                            customerName: vehicle.customerName,
                            documentType: field.name,
                            expiryDate: field.date,
                            daysUntil,
                            timestamp: new Date().toISOString(),
                            read: false
                        });
                    }
                });
            });
            
            // Store notifications
            if (notifications.length > 0) {
                storeNotifications(notifications);
                displayNotifications();
            }
        })
        .catch(error => {
            console.error("Error checking expirations:", error);
        });
}

// Store notifications
function storeNotifications(newNotifications) {
    // Get existing notifications
    const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    // Add new notifications (avoiding duplicates)
    const combined = [...existingNotifications];
    
    newNotifications.forEach(notification => {
        // Check if this notification already exists
        const exists = existingNotifications.some(n => 
            n.vehicleId === notification.vehicleId && 
            n.documentType === notification.documentType && 
            n.daysUntil === notification.daysUntil
        );
        
        if (!exists) {
            combined.push(notification);
        }
    });
    
    // Sort by date (newest first)
    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Store back in localStorage
    localStorage.setItem('notifications', JSON.stringify(combined));
    
    // Update badge count
    updateNotificationBadge();
}

// Display notifications in the panel
function displayNotifications() {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="empty-notifications">No notifications</div>';
        return;
    }
    
    // Display notifications
    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.timestamp}">
            <div class="notification-icon ${notification.daysUntil <= 7 ? 'urgent' : ''}">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">
                    ${notification.documentType} expiring in ${notification.daysUntil} days
                </div>
                <div class="notification-details">
                    Vehicle: ${notification.vehicleNumber} (${notification.customerName})
                </div>
                <div class="notification-time">
                    ${formatRelativeTime(notification.timestamp)}
                </div>
            </div>
            <button class="notification-action" onclick="markNotificationAsRead('${notification.timestamp}')">
                <i class="fas fa-check"></i>
            </button>
        </div>
    `).join('');
}

// Mark notification as read
function markNotificationAsRead(timestamp) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    const updated = notifications.map(notification => {
        if (notification.timestamp === timestamp) {
            return { ...notification, read: true };
        }
        return notification;
    });
    
    localStorage.setItem('notifications', JSON.stringify(updated));
    displayNotifications();
    updateNotificationBadge();
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    const updated = notifications.map(notification => ({ ...notification, read: true }));
    
    localStorage.setItem('notifications', JSON.stringify(updated));
    displayNotifications();
    updateNotificationBadge();
}

// Update notification badge count
function updateNotificationBadge() {
    const badge = document.getElementById('expiringCount');
    if (!badge) return;
    
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

// Format timestamp as relative time
function formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    
    // Convert to seconds
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
    
    // Return formatted date for older notifications
    return date.toLocaleDateString();
}

// Check for expirations periodically
setInterval(checkForExpirations, 3600000); // Check hourly