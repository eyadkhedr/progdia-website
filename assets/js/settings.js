import { 
    AuthManager, 
    UserManager, 
    SharedManager 
} from './firebase-config.js';

// Initialize settings page
async function initializeSettings() {
    try {
        // Wait for auth to be ready
        const user = await new Promise((resolve) => {
            const unsubscribe = AuthManager.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
        
        if (!user) {
            window.location.href = '../index.html';
            return;
        }
        
        try {
            // Load user data
            const userData = await UserManager.getCurrentUser();
            
            // Update username display
            if (userData && userData.username) {
                const usernameDisplay = document.getElementById('usernameDisplay');
                if (usernameDisplay) {
                    usernameDisplay.textContent = userData.username;
                }
            }
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    } catch (error) {
        console.error('Error initializing settings:', error);
        window.location.href = '../index.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // User menu toggle
    const userBtn = document.getElementById('userBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (userBtn && userMenu) {
        userBtn.addEventListener('click', () => {
            userMenu.classList.toggle('active');
        });
    }
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await AuthManager.signOut();
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', (event) => {
        if (userMenu && !userBtn.contains(event.target) && !userMenu.contains(event.target)) {
            userMenu.classList.remove('active');
        }
    });
}

// Initialize page
initializeSettings();

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    const user = AuthManager.getCurrentUser();
    if (user) {
        initializeSettings();
    } else {
        window.location.href = '../index.html';
    }
}); 