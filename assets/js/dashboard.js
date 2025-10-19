import { 
    AuthManager, 
    UserManager, 
    RealtimeManager 
} from './firebase-config.js';

// DOM Elements
const userName = document.getElementById('userName');
const usernameDisplay = document.getElementById('usernameDisplay');
const userMenuContainer = document.getElementById('userMenuContainer');
const userButton = document.getElementById('userButton');
const userMenu = document.getElementById('userMenu');
const logoutButton = document.getElementById('logoutButton');

// Stats elements
const completedToday = document.getElementById('completedToday');
const dayStreak = document.getElementById('dayStreak');
const totalCoins = document.getElementById('totalCoins');
const totalTasks = document.getElementById('totalTasks');

// User Menu Toggle
userButton.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('active');
});

window.addEventListener('click', () => {
    userMenu.classList.remove('active');
});

// Logout
logoutButton.addEventListener('click', async () => {
    try {
        await AuthManager.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Update stats
function updateStats(stats) {
    if (!stats) return;
    
    completedToday.textContent = stats.completedToday || 0;
    dayStreak.textContent = stats.dayStreak || 0;
    totalCoins.textContent = stats.coins || 0;
    totalTasks.textContent = stats.totalTasks || 0;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize dashboard
async function initializeDashboard() {
    try {
        console.log('Initializing dashboard...');
        
        // Wait for auth to be ready
        const user = await new Promise((resolve) => {
            const unsubscribe = AuthManager.onAuthStateChanged((user) => {
                console.log('Auth state changed:', user ? 'User logged in' : 'No user');
                unsubscribe();
                resolve(user);
            });
        });
        
        if (!user) {
            console.log('No user found, redirecting to index');
            window.location.href = '../index.html';
            return;
        }
        
        console.log('User found:', user.uid);
        
        // Update user display
        const userData = await UserManager.getCurrentUser();
        console.log('User data:', userData);
        
        if (userData) {
            userName.textContent = userData.displayName || userData.username || 'Student';
            usernameDisplay.textContent = userData.username || userData.displayName || userData.email?.split('@')[0] || 'User';
        }
        
        // Load initial data
        try {
            const stats = await UserManager.getUserStats();
            console.log('User stats:', stats);
            updateStats(stats);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showNotification('Error loading data. Please refresh the page.', 'error');
        }
        
        // Set up real-time listeners
        if (user) {
            // Listen to user stats changes
            RealtimeManager.listenToUserStats(user.uid, (userData) => {
                updateStats({
                    completedToday: userData.completedToday || 0,
                    dayStreak: userData.dayStreak || 0,
                    coins: userData.coins || 0,
                    totalTasks: userData.totalTasks || 0
                });
            });
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Don't redirect on error, just show notification
        showNotification('Error initializing dashboard. Please refresh the page.', 'error');
    }
}

// Auth state listener
AuthManager.onAuthStateChanged((user) => {
    if (user) {
        userMenuContainer.style.display = 'block';
        initializeDashboard();
    } else {
        // Don't redirect immediately, let the user stay on the page
        console.log('User signed out, but staying on dashboard');
    }
});

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', () => {
    const user = AuthManager.getCurrentUser();
    if (user) {
        userMenuContainer.style.display = 'block';
        initializeDashboard();
    } else {
        // Don't redirect immediately, let the user stay on the page
        console.log('No user found on page load, but staying on dashboard');
    }

    // Mobile menu functionality
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navContent = document.querySelector('.nav-content');

    if (mobileMenuToggle && navContent) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navContent.classList.toggle('active');
        });

        navContent.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navContent.classList.remove('active');
                // Also close user menu if open
                const userMenu = document.getElementById('userMenu');
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
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navContent.classList.contains('active')) {
                navContent.classList.remove('active');
                // Also close user menu if open
                const userMenu = document.getElementById('userMenu');
                if (userMenu) {
                    userMenu.classList.remove('active');
                }
            }
        });
    }
}); 