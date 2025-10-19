// Import Firebase from shared config
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// DOM Elements
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const logoutModal = document.getElementById('logoutModal');
const openLoginModalBtn = document.getElementById('openLoginModal');
const openSignupModalBtn = document.getElementById('openSignupModal');
const authButtons = document.getElementById('authButtons');
const closeButtons = document.querySelectorAll('.close-button');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginStatus = document.getElementById('loginStatus');
const signupStatus = document.getElementById('signupStatus');
const userMenuContainer = document.getElementById('userMenuContainer');
const userButton = document.getElementById('userButton');
const userMenu = document.getElementById('userMenu');
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutButton = document.getElementById('logoutButton');
const confirmLogout = document.getElementById('confirmLogout');
const cancelLogout = document.getElementById('cancelLogout');
const usernameError = document.getElementById('usernameError');
const signupUsername = document.getElementById('signupUsername');

// Google Sign-In elements
const googleSignInButton = document.getElementById('googleSignInButton');
const googleSignUpButton = document.getElementById('googleSignUpButton');

// Plan buttons
const freePlanBtn = document.getElementById('freePlanBtn');
const monthlyBtn = document.getElementById('monthlyBtn');
const annualBtn = document.getElementById('annualBtn');
const monthlyBtnContainer = document.getElementById('monthlyBtnContainer');
const annualBtnContainer = document.getElementById('annualBtnContainer');

// Username validation function (matches app exactly)
function getUsernameValidationError(username) {
    if (username.length === 0) return 'Username required.';
    if (username.length < 3 || username.length > 20) return 'Username must be 3-20 characters.';
    if (!/^[a-z0-9._]+$/.test(username)) return 'Only lowercase letters, numbers, underscores, and periods allowed.';
    if (username.startsWith('.') || username.startsWith('_') || username.endsWith('.') || username.endsWith('_')) return 'Cannot start or end with . or _.';
    if (username.includes('..') || username.includes('__') || username.includes('._') || username.includes('_.')) return 'No consecutive periods or underscores.';
    return null;
}

// Username availability check (matches app exactly)
async function isUsernameAvailable(username) {
    try {
        const docRef = doc(db, 'usernames', username);
        const docSnap = await getDoc(docRef);
        return !docSnap.exists();
    } catch (error) {
        console.error('Error checking username availability:', error);
        return false;
    }
}

// Username input validation
signupUsername.addEventListener('input', async function() {
    const username = this.value.trim();
    const error = getUsernameValidationError(username);
    
    if (error) {
        usernameError.textContent = error;
        usernameError.style.display = 'block';
        return;
    }
    
    if (username.length >= 3) {
        const available = await isUsernameAvailable(username);
        if (!available) {
            usernameError.textContent = 'Username already taken';
            usernameError.style.display = 'block';
        } else {
            usernameError.style.display = 'none';
        }
    } else {
        usernameError.style.display = 'none';
    }
});

// Modal Functions
function openModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function openLoginModal() {
    openModal(loginModal);
}

function openSignupModal() {
    openModal(signupModal);
}

// Make functions globally available for onclick handlers
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (modal === loginModal || modal === signupModal) {
        loginStatus.textContent = '';
        signupStatus.textContent = '';
        if (usernameError) {
            usernameError.style.display = 'none';
        }
    }
}

// Modal Event Listeners
openLoginModalBtn.addEventListener('click', () => openModal(loginModal));
openSignupModalBtn.addEventListener('click', () => openModal(signupModal));


closeButtons.forEach(button => {
    button.addEventListener('click', function() {
        const modal = this.closest('.modal');
        closeModal(modal);
    });
});

window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target);
    }
});

// Switch between login and signup
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    // Also reset the form to prevent carrying over values
    signupForm.reset();
    signupStatus.textContent = '';
    usernameError.style.display = 'none';
    openModal(signupModal);
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(signupModal);
    openModal(loginModal);
});

// User Menu Toggle
userButton.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('active');
});

window.addEventListener('click', () => {
    userMenu.classList.remove('active');
});

// Logout Flow
logoutButton.addEventListener('click', () => {
    openModal(logoutModal);
    userMenu.classList.remove('active');
});

confirmLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        closeModal(logoutModal);
    }).catch((error) => {
        console.error("Logout error:", error);
    });
});

cancelLogout.addEventListener('click', () => {
    closeModal(logoutModal);
});

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        userMenuContainer.style.display = 'block';
        authButtons.style.display = 'none';
        
        // Display user's username from Firestore
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
        
        // Update premium buttons for logged-in users
        if (monthlyBtn && monthlyBtnContainer) {
            monthlyBtn.style.display = 'none';
            monthlyBtnContainer.style.display = 'block';
        }
        
        if (annualBtn && annualBtnContainer) {
            annualBtn.style.display = 'none';
            annualBtnContainer.style.display = 'block';
        }
        
        if (freePlanBtn) {
            freePlanBtn.style.display = 'none';
        }
        
        // Close any open auth modals
        closeModal(loginModal);
        closeModal(signupModal);
    } else {
        // User is signed out
        userMenuContainer.style.display = 'none';
        authButtons.style.display = 'flex';
        
        // Update premium buttons for non-logged-in users
        if (monthlyBtn && monthlyBtnContainer) {
            monthlyBtn.style.display = 'block';
            monthlyBtnContainer.style.display = 'none';
            monthlyBtn.textContent = 'Login to Subscribe';
            monthlyBtn.onclick = () => openModal(loginModal);
        }
        
        if (annualBtn && annualBtnContainer) {
            annualBtn.style.display = 'block';
            annualBtnContainer.style.display = 'none';
            annualBtn.textContent = 'Login to Subscribe';
            annualBtn.onclick = () => openModal(loginModal);
        }
        
        if (freePlanBtn) {
            freePlanBtn.style.display = 'block';
        }
    }
});

// Google Sign-In Provider
const googleProvider = new GoogleAuthProvider();

// Google Sign-In Function
async function handleGoogleSignIn() {
    console.log('Google Sign-In initiated...');
    try {
        // Show loading state
        if (loginStatus) {
            loginStatus.textContent = 'Signing in with Google...';
            loginStatus.className = 'status-message';
        }
        if (signupStatus) {
            signupStatus.textContent = 'Signing up with Google...';
            signupStatus.className = 'status-message';
        }
        
        console.log('Attempting Firebase Google Sign-In...');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('Google Sign-In successful:', user.email);
        
        // Create user document in Firestore
        const userDoc = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            createdAt: new Date(),
            provider: 'google',
            lastLogin: new Date()
        };
        
        await setDoc(doc(db, 'users', user.uid), userDoc, { merge: true });
        
        // Show success message
        if (loginStatus) {
            loginStatus.textContent = 'Google sign-in successful! Redirecting...';
            loginStatus.className = 'status-message success-message';
        }
        if (signupStatus) {
            signupStatus.textContent = 'Google sign-up successful! Redirecting...';
            signupStatus.className = 'status-message success-message';
        }
        
        // Close modal and redirect after a short delay
        setTimeout(() => {
            closeModal(loginModal);
            closeModal(signupModal);
            window.location.href = 'pages/dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        let errorMessage = 'Google sign-in failed. Please try again.';
        
        // Handle specific Firebase errors
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in was cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Pop-up was blocked. Please allow pop-ups and try again.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        if (loginStatus) {
            loginStatus.textContent = errorMessage;
            loginStatus.className = 'status-message error-message';
        }
        if (signupStatus) {
            signupStatus.textContent = errorMessage;
            signupStatus.className = 'status-message error-message';
        }
    }
}

// Make function globally accessible
window.handleGoogleSignIn = handleGoogleSignIn;

// Initialize Google Sign-In buttons
function initializeGoogleSignIn() {
    if (googleSignInButton) {
        googleSignInButton.innerHTML = `
            <button onclick="handleGoogleSignIn()" style="
                background: #4285f4;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: 'Poppins', sans-serif;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#3367d6'" onmouseout="this.style.background='#4285f4'">
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            </button>
        `;
    }
    
    if (googleSignUpButton) {
        googleSignUpButton.innerHTML = `
            <button onclick="handleGoogleSignIn()" style="
                background: #4285f4;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: 'Poppins', sans-serif;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#3367d6'" onmouseout="this.style.background='#4285f4'">
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
            </button>
        `;
    }
}

// Login Form Submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    loginStatus.textContent = 'Logging in...';
    loginStatus.className = 'status-message';
    
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            loginStatus.textContent = 'Login successful! Redirecting...';
            loginStatus.className = 'status-message success-message';
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 1500);
        })
        .catch((error) => {
            loginStatus.textContent = error.message;
            loginStatus.className = 'status-message error-message';
        });
});

// Signup Form Submission (matches app exactly)
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    // Username validation FIRST (matches app logic)
    const usernameError = getUsernameValidationError(username);
    if (usernameError) {
        signupStatus.textContent = usernameError;
        signupStatus.className = 'status-message error-message';
        return;
    }
    
    // Check username availability
    const available = await isUsernameAvailable(username);
    if (!available) {
        signupStatus.textContent = 'Username already taken';
        signupStatus.className = 'status-message error-message';
        return;
    }
    
    signupStatus.textContent = 'Creating account...';
    signupStatus.className = 'status-message';
    
    try {
        // Create user with email/password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update display name
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        // Save to Firestore (matches app structure exactly)
        const userId = userCredential.user.uid;
        
        // Save to users/{userId}
        await setDoc(doc(db, "users", userId), {
            username: username,
        }, { merge: true });
        
        // Save to usernames/{username}
        await setDoc(doc(db, "usernames", username), {
            userId: userId,
        });
        
        signupStatus.textContent = 'Account created successfully! Redirecting...';
        signupStatus.className = 'status-message success-message';
        setTimeout(() => {
            window.location.href = 'pages/dashboard.html';
        }, 1500);
        
    } catch (error) {
        signupStatus.textContent = error.message;
        signupStatus.className = 'status-message error-message';
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80; // Account for fixed navbar
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Simple scroll animation for elements
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('animate');
        }
    });
};

window.addEventListener('scroll', animateOnScroll);
animateOnScroll(); // Run once on load

// Welcome popup functionality
const celestialGateway = document.getElementById('celestialPopup');
const quantumTerminal = document.querySelector('.eventHorizonClose');
const quantumPurchaseBtn = document.querySelector('.cosmicButton.primary');

// Activate popup on page load with delay (show every time)
    const hyperionWake = setTimeout(() => {
        celestialGateway.classList.add('active');
    }, 1500); // 1.5 second delay

// Close functionality
function collapseCelestialGateway() {
    celestialGateway.classList.remove('active');
    // Don't mark as seen, so it shows every time
}

// Normal close for X button
quantumTerminal.addEventListener('click', collapseCelestialGateway);

// Special action for purchase button
quantumPurchaseBtn.addEventListener('click', function() {
    collapseCelestialGateway();
    
    // Scroll to #versions section after a slight delay for smooth transition
    setTimeout(() => {
        const versionsSection = document.getElementById('versions');
        if (versionsSection) {
            versionsSection.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }, 300); // Short delay to allow popup to close first
});

// Function to style Stripe buttons to match our design
function styleStripeButtons() {
    const stripeButtons = document.querySelectorAll('stripe-buy-button button');
    stripeButtons.forEach(button => {
        // Match the exact styling of our version buttons
        button.style.background = 'linear-gradient(135deg, var(--accent), var(--secondary))';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '8px';
        button.style.padding = '0.75rem 1.5rem';
        button.style.fontSize = '1rem';
        button.style.fontWeight = '600';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.3s ease';
        button.style.boxShadow = '0 5px 15px rgba(230, 103, 2, 0.3)';
        button.style.width = '100%';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.gap = '0.5rem';
        button.style.fontFamily = "'Poppins', sans-serif";
        button.style.minHeight = '48px';
        button.style.textDecoration = 'none';
        button.style.margin = '0';
        button.style.outline = 'none';
        
        // Add hover effect to match our buttons
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 8px 20px rgba(230, 103, 2, 0.4)';
            button.style.background = 'linear-gradient(135deg, var(--secondary), var(--accent))';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 5px 15px rgba(230, 103, 2, 0.3)';
            button.style.background = 'linear-gradient(135deg, var(--accent), var(--secondary))';
        });
    });
}

// Initialize DOM elements and setup
document.addEventListener('DOMContentLoaded', () => {
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
                // Also close user menu if open
                const userMenu = document.getElementById('userMenu');
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
                const userMenu = document.getElementById('userMenu');
                if (userMenu) {
                    userMenu.classList.remove('active');
                }
            }
        });
    }

    // Free plan button event listener
    const freePlanBtn = document.getElementById('freePlanBtn');
    const signupModal = document.getElementById('signupModal');
    if (freePlanBtn) {
        freePlanBtn.addEventListener('click', () => openModal(signupModal));
    }

    // Video speed control for prototype video
    const prototypeVideo = document.querySelector('#vision video');
    const fallbackImage = document.getElementById('visionFallback');
    
    if (prototypeVideo) {
        // Set video speed to 2x
        prototypeVideo.playbackRate = 2.0;
        
        // Ensure video plays continuously
        prototypeVideo.addEventListener('ended', () => {
            prototypeVideo.currentTime = 0;
            prototypeVideo.play();
        });
        
        // Handle video loading
        prototypeVideo.addEventListener('loadedmetadata', () => {
            prototypeVideo.playbackRate = 2.0;
        });
        
        // Handle video error - show fallback image
        prototypeVideo.addEventListener('error', () => {
            if (fallbackImage) {
                prototypeVideo.style.display = 'none';
                fallbackImage.style.display = 'block';
            }
        });
        
        // Handle video load success - hide fallback image
        prototypeVideo.addEventListener('loadeddata', () => {
            if (fallbackImage) {
                fallbackImage.style.display = 'none';
            }
        });
    }

    // Mutation observer to style Stripe buttons when they appear
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'STRIPE-BUY-BUTTON' || node.querySelector('stripe-buy-button')) {
                            setTimeout(styleStripeButtons, 100);
                        }
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initialize Google Sign-In buttons
    initializeGoogleSignIn();
    
    // Make Google Sign-In function globally accessible
    window.handleGoogleSignIn = handleGoogleSignIn;
    
    // Test Firebase connection
    console.log('Firebase auth object:', auth);
    console.log('Google provider:', googleProvider);

    // Load Stripe script for buttons
    if (!document.querySelector('script[src*="stripe.com"]')) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/buy-button.js';
        script.async = true;
        document.head.appendChild(script);
    }
}); 