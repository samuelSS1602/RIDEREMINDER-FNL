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


// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence for Firestore
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            showToast('Multiple tabs open, persistence can only be enabled in one tab at a time', 'error');
        } else if (err.code == 'unimplemented') {
            showToast('The current browser doesn\'t support persistence', 'error');
        }
    });

// Form Elements
const bookForm = document.getElementById('bookForm');
const bookEmail = document.getElementById('bookEmail');
const bookPassword = document.getElementById('bookPassword');
const rememberMe = document.getElementById('rememberMe');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const loginBox = document.getElementById('loginBox');

// Toast functionality
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#fee2e2' : '#f0fdf4';
    toast.style.color = type === 'error' ? '#dc2626' : '#16a34a';
    toast.style.borderLeft = `4px solid ${type === 'error' ? '#dc2626' : '#16a34a'}`;

    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// Loading State Management
function setLoading(isLoading) {
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');
    
    if (isLoading) {
        submitBtn.disabled = true;
        btnText.style.opacity = '0';
        spinner.style.display = 'block';
    } else {
        submitBtn.disabled = false;
        btnText.style.opacity = '1';
        spinner.style.display = 'none';
    }
}

// Input Validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Remember Me functionality
function setupRememberMe() {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
        bookEmail.value = remembered;
        rememberMe.checked = true;
    }
}

// Form submission handler
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset error messages
    emailError.style.display = 'none';
    passwordError.style.display = 'none';
    
    const email = bookEmail.value.trim();
    const password = bookPassword.value;
    let hasError = false;
    
    // Validate email
    if (!validateEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
        hasError = true;
    }
    
    // Validate password
    if (!validatePassword(password)) {
        passwordError.textContent = 'Password must be at least 6 characters long';
        passwordError.style.display = 'block';
        hasError = true;
    }
    
    if (hasError) return;
    
    try {
        setLoading(true);
        
        // Sign in user
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Handle Remember Me
        if (rememberMe.checked) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        showToast('Login successful! Redirecting...', 'success');
        
        // Add animation before redirect
        loginBox.style.transform = 'translateY(-20px) scale(0.95)';
        loginBox.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = './VEHPAGE.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        setLoading(false);
        handleLoginError(error);
    }
});

// Add this helper function for error handling
function handleLoginError(error) {
    let errorMessage = 'An error occurred during login';
    
    switch (error.code) {
        case 'auth/user-not-found':
            errorMessage = 'No account found with this email';
            emailError.textContent = errorMessage;
            emailError.style.display = 'block';
            break;
        case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            passwordError.textContent = errorMessage;
            passwordError.style.display = 'block';
            break;
        case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
        case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
        case 'permission-denied':
            errorMessage = 'Access denied. Please contact administrator';
            break;
    }
    
    showToast(errorMessage, 'error');
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleButton = input.parentElement.querySelector('.password-toggle');
    const eyeIcon = toggleButton.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.className = 'far fa-eye-slash';
        toggleButton.setAttribute('aria-label', 'Hide password');
    } else {
        input.type = 'password';
        eyeIcon.className = 'far fa-eye';
        toggleButton.setAttribute('aria-label', 'Show password');
    }
}

// Handle forgot password
async function forgotPassword() {
    const email = bookEmail.value.trim() || prompt("Enter your email address:");
    
    if (!email) return;
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        setLoading(true);
        await firebase.auth().sendPasswordResetEmail(email);
        showToast('Password reset email sent! Please check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        let errorMessage = 'Error sending reset email';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        setLoading(false);
    }
}

// Input validation on typing
bookEmail.addEventListener('input', function() {
    this.value = this.value.trim();
    emailError.style.display = 'none';
    if (this.value && !validateEmail(this.value)) {
        this.style.borderColor = '#ef4444';
    } else {
        this.style.borderColor = '';
    }
});

bookPassword.addEventListener('input', function() {
    passwordError.style.display = 'none';
    if (this.value && !validatePassword(this.value)) {
        this.style.borderColor = '#ef4444';
    } else {
        this.style.borderColor = '';
    }
});

// Network status monitoring with UI feedback
window.addEventListener('online', () => {
    console.log('Application is online');
    showToast('Connection restored', 'success');
    db.enableNetwork().catch(console.error);
});

window.addEventListener('offline', () => {
    console.log('Application is offline');
    showToast('You are offline. Some features may be limited.', 'error');
    db.disableNetwork().catch(console.error);
});

// Initialize Remember Me on page load
document.addEventListener('DOMContentLoaded', setupRememberMe);

// Modify the auth state observer
auth.onAuthStateChanged(async user => {
    if (user) {
        console.log('User is signed in:', user.uid);
        
        try {
            // First check if user document exists
            const userRef = db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Create new user document
                await userRef.set({
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Only update lastActive timestamp
                await userRef.update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Redirect if on login page
            if (window.location.pathname.includes('login')) {
                window.location.href = './VEHPAGE.html';
            }
        } catch (error) {
            console.error('Error updating user data:', error);
            showToast('Error updating user data. Some features may be limited.', 'error');
        }
    } else {
        console.log('User is signed out');
    }
});