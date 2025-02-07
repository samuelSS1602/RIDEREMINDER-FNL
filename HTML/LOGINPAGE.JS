// Form submission handler
document.getElementById('bookForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const bookEmail = document.getElementById('bookEmail').value;
    const bookPassword = document.getElementById('bookPassword').value;

    firebase.auth().signInWithEmailAndPassword(bookEmail, bookPassword)
        .then(() => {
            window.location.href = './VEHPAGE.html';
        })
        .catch((error) => {
            alert("Login failed: " + error.message);
        });
});

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleButton = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        toggleButton.innerHTML = '<i class="far fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        toggleButton.innerHTML = '<i class="far fa-eye"></i>';
    }
}

// Handle forgot password
function forgotPassword() {
    const email = prompt("Enter your email address:");
    if (email) {
        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                alert("Password reset email sent! Please check your inbox.");
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    }
}