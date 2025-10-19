// Import Firebase from shared config
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// DOM Elements
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const totalTasks = document.getElementById('totalTasks');
const completedToday = document.getElementById('completedToday');
const dayStreak = document.getElementById('dayStreak');
const totalCoins = document.getElementById('totalCoins');
const activitySummary = document.getElementById('activitySummary');
const usernameDisplay = document.getElementById('usernameDisplay');

// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navContent = document.querySelector('.nav-content');
const userMenu = document.getElementById('userMenu');

if (mobileMenuToggle && navContent) {
    mobileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navContent.classList.toggle('active');
    });

    // Close menu when clicking on links
    navContent.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navContent.classList.remove('active');
            // Also close user menu if open
            if (userMenu) {
                userMenu.classList.remove('active');
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navContent.classList.contains('active') && 
            !navContent.contains(e.target) && 
            !mobileMenuToggle.contains(e.target)) {
            navContent.classList.remove('active');
            // Also close user menu if open
            if (userMenu) {
                userMenu.classList.remove('active');
            }
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navContent.classList.contains('active')) {
            navContent.classList.remove('active');
            // Also close user menu if open
            if (userMenu) {
                userMenu.classList.remove('active');
            }
        }
    });
}

// User menu functionality
const userButton = document.getElementById('userButton');
const logoutButton = document.getElementById('logoutButton');

if (userButton && userMenu) {
    userButton.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('active');
    });

    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (userMenu.classList.contains('active') && 
            !userMenu.contains(e.target) && 
            !userButton.contains(e.target)) {
            userMenu.classList.remove('active');
        }
    });

    // Close user menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && userMenu.classList.contains('active')) {
            userMenu.classList.remove('active');
        }
    });
}

// Logout functionality
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
}

// Update username display in navigation
async function updateUsernameDisplay(user) {
    if (usernameDisplay) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().username) {
                usernameDisplay.textContent = userDoc.data().username;
            } else {
                usernameDisplay.textContent = user.displayName || user.email.split('@')[0];
            }
        } catch (error) {
            console.error('Error fetching username:', error);
            usernameDisplay.textContent = user.displayName || user.email.split('@')[0];
        }
    }
}

// Load user profile data
async function loadUserProfile(user) {
    try {
        // Update username display first
        await updateUsernameDisplay(user);
        
        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update profile header
            if (profileName) {
                profileName.textContent = userData.displayName || user.displayName || 'User Profile';
            }
            if (profileEmail) {
                profileEmail.textContent = userData.email || user.email || 'inquiry.progdia@gmail.com';
            }
            
            // Update stats (mock data for now)
            if (totalTasks) totalTasks.textContent = userData.totalTasks || '0';
            if (completedToday) completedToday.textContent = userData.completedToday || '0';
            if (dayStreak) dayStreak.textContent = userData.dayStreak || '0';
            if (totalCoins) totalCoins.textContent = userData.totalCoins || '0';
            
            // Update activity summary
            if (activitySummary) {
                activitySummary.innerHTML = `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: var(--primary); margin-bottom: 0.5rem;">Recent Activity</h4>
                        <p style="color: #666; font-size: 0.9rem;">Last active: ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: var(--primary); margin-bottom: 0.5rem;">Account Info</h4>
                        <p style="color: #666; font-size: 0.9rem;">Member since: ${userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                        <p style="color: #666; font-size: 0.9rem;">Provider: ${userData.provider || 'email'}</p>
                    </div>
                `;
            }
        } else {
            // Fallback if no user document exists
            if (profileName) profileName.textContent = user.displayName || 'User Profile';
            if (profileEmail) profileEmail.textContent = user.email || 'inquiry.progdia@gmail.com';
            
            if (totalTasks) totalTasks.textContent = '0';
            if (completedToday) completedToday.textContent = '0';
            if (dayStreak) dayStreak.textContent = '0';
            if (totalCoins) totalCoins.textContent = '0';
            
            if (activitySummary) {
                activitySummary.innerHTML = '<p>No activity data available.</p>';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        
        // Fallback values
        if (profileName) profileName.textContent = user.displayName || 'User Profile';
        if (profileEmail) profileEmail.textContent = user.email || 'inquiry.progdia@gmail.com';
        
        if (totalTasks) totalTasks.textContent = '0';
        if (completedToday) completedToday.textContent = '0';
        if (dayStreak) dayStreak.textContent = '0';
        if (totalCoins) totalCoins.textContent = '0';
        
        if (activitySummary) {
            activitySummary.innerHTML = '<p>Error loading activity data.</p>';
        }
    }
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        loadUserProfile(user);
    } else {
        // User is signed out, redirect to login
        window.location.href = '../index.html';
    }
}); 