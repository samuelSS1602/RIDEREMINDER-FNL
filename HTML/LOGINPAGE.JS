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
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser doesn\'t support persistence');
        }
    });

// Form Elements
const bookForm = document.getElementById('bookForm');
const bookEmail = document.getElementById('bookEmail');
const bookPassword = document.getElementById('bookPassword');

// Loading State Management
function setLoading(isLoading) {
    const submitBtn = document.querySelector('.submit-btn');
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing In...</span>';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span>';
    }
}

// Form submission handler
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const email = bookEmail.value.trim();
        const password = bookPassword.value;
        
        if (!email.includes('@')) {
            throw new Error('Please enter a valid email address');
        }
        
        await firebase.auth().signInWithEmailAndPassword(email, password);
        window.location.href = './VEHPAGE.html';
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = error.message;
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email. Please check and try again.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
        }
        
        alert("Login failed: " + errorMessage);
        setLoading(false);
    }
});

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleButton = input.nextElementSibling;
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
function forgotPassword() {
    const email = prompt("Enter your email address:");
    
    if (!email) return;
    
    if (!email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            alert("Password reset email sent! Please check your inbox.");
        })
        .catch((error) => {
            console.error('Password reset error:', error);
            let errorMessage = error.message;
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            }
            
            alert("Error: " + errorMessage);
        });
}

// Auth state observer
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User is signed in:', user.uid);
        
        db.collection('users').doc(user.uid).set({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(console.error);
        
        if (window.location.pathname.includes('login')) {
            window.location.href = './VEHPAGE.html';
        }
    } else {
        console.log('User is signed out');
    }
});

// Input validation
bookEmail.addEventListener('input', function() {
    this.value = this.value.trim();
    if (this.value && !this.value.includes('@')) {
        this.style.borderColor = 'red';
    } else {
        this.style.borderColor = '';
    }
});

// Clear form errors on focus
[bookEmail, bookPassword].forEach(input => {
    input.addEventListener('focus', function() {
        this.style.borderColor = '';
    });
});

// Prevent multiple form submissions
let isSubmitting = false;
bookForm.addEventListener('submit', () => {
    if (isSubmitting) return false;
    isSubmitting = true;
    setTimeout(() => isSubmitting = false, 2000);
});

// Handle page visibility changes instead of unload
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // Perform cleanup or save state here
        const user = auth.currentUser;
        if (user) {
            db.collection('users').doc(user.uid).set({
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(console.error);
        }
    }
});

// Modern way to handle beforeunload if absolutely necessary
window.addEventListener('beforeunload', (event) => {
    const user = auth.currentUser;
    if (user) {
        // Synchronous operations only
        localStorage.setItem('lastSessionTime', new Date().toISOString());
    }
});

// Network status monitoring
window.addEventListener('online', () => {
    console.log('Application is online');
    db.enableNetwork().catch(console.error);
});

window.addEventListener('offline', () => {
    console.log('Application is offline');
    db.disableNetwork().catch(console.error);
    alert('You are currently offline. Some features may be limited.');
});