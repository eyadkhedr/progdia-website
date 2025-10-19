import { AuthManager, UserManager } from './firebase-config.js';

// Common DOM elements (these should exist on all pages)
const usernameDisplay = document.getElementById('usernameDisplay');
const userMenuContainer = document.getElementById('userMenuContainer');
const userButton = document.getElementById('userButton');
const userMenu = document.getElementById('userMenu');
const logoutButton = document.getElementById('logoutButton');

// Shared functionality
export class SharedManager {
    static async initializePage() {
        const user = AuthManager.getCurrentUser();
        
        if (!user) {
            window.location.href = '../index.html';
            return false;
        }
        
        // Update user display
        const userData = await UserManager.getCurrentUser();
        if (userData && usernameDisplay) {
            usernameDisplay.textContent = userData.username || 'User';
        }
        
        // Show user menu
        if (userMenuContainer) {
            userMenuContainer.style.display = 'block';
        }
        
        return true;
    }
    
    static setupEventListeners() {
        // User Menu Toggle
        if (userButton) {
            userButton.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('active');
            });
        }
        
        // Close menu when clicking outside
        window.addEventListener('click', () => {
            if (userMenu) {
                userMenu.classList.remove('active');
            }
        });
        
        // Logout
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    await AuthManager.signOut();
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Logout error:', error);
                }
            });
        }
    }
    
    static showNotification(message, type = 'info') {
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
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    static addNotificationStyles() {
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
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
        }
    }
}

// Initialize shared functionality
export async function initializeShared() {
    SharedManager.addNotificationStyles();
    SharedManager.setupEventListeners();
    
    // Auth state listener
    AuthManager.onAuthStateChanged((user) => {
        if (user) {
            SharedManager.initializePage();
        } else {
            window.location.href = '../index.html';
        }
    });
} 