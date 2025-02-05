const firebaseConfig = {
    apiKey: "AIzaSyCoR3Bz7w4udNv9KQDstID8R0n0za5t9Fw",
    authDomain: "ridereminder-3a89c.firebaseapp.com",
    projectId: "ridereminder-3a89c",
    storageBucket: "ridereminder-3a89c.firebasestorage.app",
    messagingSenderId: "80786513038",
    appId: "1:80786513038:web:e7ad093305dffd70d5bddf",
    measurementId: "G-GLRPTCH4NE"
};

;

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();


