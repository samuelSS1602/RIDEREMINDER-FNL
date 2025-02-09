const firebaseConfig = {
    apiKey: "AIzaSyCoR3Bz7w4udNv9KQDstID8R0n0za5t9Fw",
    authDomain: "ridereminder-3a89c.firebaseapp.com",
    projectId: "ridereminder-3a89c",
    storageBucket: "ridereminder-3a89c.firebasestorage.app",
    messagingSenderId: "80786513038",
    appId: "1:80786513038:web:e7ad093305dffd70d5bddf",
    measurementId: "G-GLRPTCH4NE"
};

// Initialize Firebase with error handling
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
firebase.firestore().enablePersistence({synchronizeTabs: true})
    .then(() => console.log("Offline persistence enabled"))
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

// Check Authentication State
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "./index.html";
    } else {
        document.getElementById('userEmail').textContent = user.email;
        fetchAndDisplayVehicles(user.uid);
    }
});

// Add this function to calculate status
function calculateStatus(vehicle) {
    const today = new Date();
    const warningDays = 30; // Days before expiry to show warning

    const dates = [
        vehicle.permitDate,
        vehicle.fcDate,
        vehicle.icDate,
        vehicle.taxDate,
        vehicle.greenTaxDate
    ].filter(date => date); // Filter out null/undefined dates

    if (dates.length === 0) return 'Active';

    const earliestDate = new Date(Math.min(...dates.map(date => new Date(date))));
    
    if (earliestDate < today) {
        return 'Expired';
    }

    const daysUntilExpiry = Math.ceil((earliestDate - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= warningDays ? 'Expiring Soon' : 'Active';
}

// Modify the fetchAndDisplayVehicles function
async function fetchAndDisplayVehicles(userId) {
    if (!userId) {
        console.error("No userId provided");
        return;
    }

    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "<tr><td colspan='12' class='text-center'>Loading...</td></tr>";

    try {
        console.log("Fetching vehicles for user:", userId);
        const vehiclesRef = db.collection("vehicles")
            .where("userId", "==", userId)
            .orderBy("vehicleNumber", "asc");
        
        const snapshot = await vehiclesRef.get();
        console.log("Fetched documents:", snapshot.size);

        const vehicles = [];
        snapshot.forEach(doc => {
            vehicles.push({
                id: doc.id,
                ...doc.data()
            });
        });

        if (vehicles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan='12' class='text-center'>
                        No vehicles found. <a href="./DTEPAGE2.html" class="text-blue-600 hover:underline">Add a vehicle</a>
                    </td>
                </tr>`;
            return;
        }

        // Display vehicles
        displayVehicles(vehicles);
        
        // Update dashboard stats
        updateDashboardStats(vehicles);
        
        // Update record count
        document.getElementById('recordCount').textContent = `${vehicles.length} records`;

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

// Add helper function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Modify the displayVehicles function
function displayVehicles(vehicles) {
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";

    vehicles.forEach((vehicle, index) => {
        const status = calculateStatus(vehicle);
        const row = document.createElement('tr');
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
            <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
            <td class="action-buttons">
                <button onclick="editVehicle('${vehicle.id}')" class="action-btn edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteVehicle('${vehicle.id}')" class="action-btn delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Update Dashboard Stats
function updateDashboardStats(vehicles) {
    const stats = {
        total: vehicles.length,
        active: 0,
        expiringSoon: 0,
        expired: 0,
        boardTypes: {}
    };

    vehicles.forEach(vehicle => {
        const status = calculateStatus(vehicle);
        const boardType = vehicle.boardType || 'Unspecified';
        
        // Update status counts
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
        
        // Update board type counts
        stats.boardTypes[boardType] = (stats.boardTypes[boardType] || 0) + 1;
    });

    // Update UI
    document.getElementById('totalVehicles').textContent = stats.total;
    document.getElementById('activeVehicles').textContent = stats.active;
    document.getElementById('expiringSoon').textContent = stats.expiringSoon;
    document.getElementById('expired').textContent = stats.expired;

    // Update board type filter if it exists
    updateBoardTypeFilter(Object.keys(stats.boardTypes));
}

// Update Board Type Filter
function updateBoardTypeFilter(boardTypes) {
    const filterSelect = document.getElementById('boardTypeFilter');
    if (!filterSelect) return;

    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="all">All Board Types</option>';
    
    boardTypes.sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        filterSelect.appendChild(option);
    });

    filterSelect.value = currentValue;
}

// Filter Table
function filterTable() {
    const statusFilter = document.getElementById('statusFilter').value;
    const boardTypeFilter = document.getElementById('boardTypeFilter').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    
    const rows = document.getElementById('table-body').getElementsByTagName('tr');

    for (let row of rows) {
        const statusCell = row.querySelector('.status-badge');
        const boardTypeCell = row.children[2]; // Adjust index based on your table structure
        
        if (!statusCell || !boardTypeCell) continue;

        const status = statusCell.textContent;
        const boardType = boardTypeCell.textContent;
        const rowText = row.textContent.toLowerCase();

        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesBoardType = boardTypeFilter === 'all' || boardType === boardTypeFilter;
        const matchesSearch = rowText.includes(searchInput);

        row.style.display = (matchesStatus && matchesBoardType && matchesSearch) ? '' : 'none';
    }
}

// Sort Table
function sortTable(column) {
    const tableBody = document.getElementById('table-body');
    const rows = Array.from(tableBody.getElementsByTagName('tr'));
    
    rows.sort((a, b) => {
        const aValue = a.children[column].textContent;
        const bValue = b.children[column].textContent;
        
        if (column === 0) { // S.NO column
            return parseInt(aValue) - parseInt(bValue);
        }
        
        return aValue.localeCompare(bValue);
    });
    
    rows.forEach(row => tableBody.appendChild(row));
}

// Rest of your existing functions (calculateStatus, formatDate, etc.) remain the same
// ... (keep all other existing functions)

// Add refresh functionality
function refreshTable() {
    const user = auth.currentUser;
    if (user) {
        fetchAndDisplayVehicles(user.uid);
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add sort functionality to table headers
    const headers = document.querySelectorAll('.vehicle-table th');
    headers.forEach((header, index) => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => sortTable(index));
    });

    // Add filter change listeners
    document.getElementById('statusFilter').addEventListener('change', filterTable);
    document.getElementById('boardTypeFilter').addEventListener('change', filterTable);
    document.getElementById('searchInput').addEventListener('input', filterTable);
});

// Add authentication listener at the bottom of the file
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("User authenticated:", user.email);
        document.getElementById('userEmail').textContent = user.email;
        fetchAndDisplayVehicles(user.uid);
    } else {
        console.log("No user authenticated, redirecting to login");
        window.location.href = "./index.html";
    }
});

// Add these functions after your existing code

// Enhanced exportToExcel function with better formatting
function exportToExcel() {
    try {
        const table = document.querySelector('.vehicle-table');
        const rows = Array.from(table.querySelectorAll('tr'));
        
        // Add BOM for Excel UTF-8 compatibility
        let csvContent = '\uFEFF';
        
        // Convert table data to CSV with proper escaping
        csvContent += rows.map(row => {
            return Array.from(row.cells)
                .map(cell => {
                    // Escape special characters and wrap in quotes if needed
                    const content = cell.textContent.replace(/"/g, '""');
                    return content.includes(',') || content.includes('"') || content.includes('\n')
                        ? `"${content}"`
                        : content;
                })
                .join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `vehicle_records_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        alert("Error exporting data. Please try again.");
    }
}

// Logout function
async function logout() {
    try {
        const confirmLogout = confirm("Are you sure you want to logout?");
        if (!confirmLogout) return;

        await firebase.auth().signOut();
        console.log("User logged out successfully");
        window.location.href = "./index.html";
    } catch (error) {
        console.error("Error during logout:", error);
        alert("Error logging out. Please try again.");
    }
}

// Navigation function
function goToAddVehicle() {
    window.location.href = "./DTEPAGE2.html";
}

// Delete vehicle function
async function deleteVehicle(vehicleId) {
    if (!vehicleId) return;

    const confirmDelete = confirm("Are you sure you want to delete this vehicle?");
    if (!confirmDelete) return;

    try {
        await db.collection("vehicles").doc(vehicleId).delete();
        console.log("Vehicle deleted successfully");
        
        // Refresh the table
        const user = auth.currentUser;
        if (user) {
            fetchAndDisplayVehicles(user.uid);
        }
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        alert("Error deleting vehicle. Please try again.");
    }
}

// Edit vehicle function
function editVehicle(vehicleId) {
    if (!vehicleId) return;
    // Store the vehicle ID in session storage for the edit page
    sessionStorage.setItem('editVehicleId', vehicleId);
    window.location.href = `./DTEPAGE2.html?edit=${vehicleId}`;
}