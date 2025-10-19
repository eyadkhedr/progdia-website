// Firebase Configuration - Shared across all pages
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    updateDoc,
    deleteDoc,
    addDoc,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCodqc_7kfKQXOCEBLbK1YqkeVpnoyVKwU",
    authDomain: "launchx-app-15.firebaseapp.com",
    projectId: "launchx-app-15",
    storageBucket: "launchx-app-15.firebasestorage.app",
    messagingSenderId: "115906225321",
    appId: "1:115906225321:web:6fba26d331a917641ef5b8",
    measurementId: "G-Y8PD04PWY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase instances
export { auth, db };

// User Management Functions
export class UserManager {
    static async getCurrentUser() {
        const user = auth.currentUser;
        if (!user) return null;
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = { ...user, ...userDoc.data() };
                
                // Check if premium subscription has expired
                if (userData.isPremium && userData.premiumExpirationDate) {
                    const expirationDate = userData.premiumExpirationDate.toDate ? 
                        userData.premiumExpirationDate.toDate() : 
                        new Date(userData.premiumExpirationDate);
                    
                    if (expirationDate < new Date()) {
                        // Premium has expired, update user status
                        await this.updateUserProfile({
                            isPremium: false,
                            subscriptionStatus: 'expired'
                        });
                        userData.isPremium = false;
                        userData.subscriptionStatus = 'expired';
                    }
                }
                
                return userData;
            }
            return user;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return user;
        }
    }

    static async updateUserProfile(updates) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in");
        
        try {
            await updateDoc(doc(db, "users", user.uid), updates);
            return true;
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    }

    static async getUserStats() {
        const user = auth.currentUser;
        if (!user) return null;
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            // Get user's tasks - simplified query to avoid null issues
            const tasksQuery = query(collection(db, "users", user.uid, "tasks"));
            const tasksSnapshot = await getDocs(tasksQuery);
            const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Calculate stats
            const completedToday = tasks.filter(task => {
                if (!task.lastCompleted) return false;
                const lastCompleted = new Date(task.lastCompleted.toDate ? task.lastCompleted.toDate() : task.lastCompleted);
                const today = new Date();
                return lastCompleted.toDateString() === today.toDateString();
            }).length;
            
            const totalTasks = tasks.length;
            const dayStreak = userData.dayStreak || 0;
            const coins = userData.coins || 0;
            
            return {
                completedToday,
                totalTasks,
                dayStreak,
                coins,
                tasks
            };
        } catch (error) {
            console.error("Error fetching user stats:", error);
            return {
                completedToday: 0,
                totalTasks: 0,
                dayStreak: 0,
                coins: 0,
                tasks: []
            };
        }
    }
}

// Task Management Functions
export class TaskManager {
    static async getUserTasks() {
        const user = auth.currentUser;
        if (!user) return [];
        
        try {
            const tasksQuery = query(collection(db, "users", user.uid, "tasks"));
            const snapshot = await getDocs(tasksQuery);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }
    }

    static async addTask(taskData) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in");
        
        try {
            const taskRef = await addDoc(collection(db, "users", user.uid, "tasks"), {
                ...taskData,
                completed: false,
                createdAt: new Date(),
                lastCompleted: null
            });
            return taskRef.id;
        } catch (error) {
            console.error("Error adding task:", error);
            throw error;
        }
    }

    static async updateTask(taskId, updates) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in");
        
        try {
            await updateDoc(doc(db, "users", user.uid, "tasks", taskId), updates);
            return true;
        } catch (error) {
            console.error("Error updating task:", error);
            throw error;
        }
    }

    static async deleteTask(taskId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in");
        
        try {
            await deleteDoc(doc(db, "users", user.uid, "tasks", taskId));
            return true;
        } catch (error) {
            console.error("Error deleting task:", error);
            throw error;
        }
    }

    static async toggleTaskCompletion(taskId) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in");
        
        try {
            const taskDoc = await getDoc(doc(db, "users", user.uid, "tasks", taskId));
            if (!taskDoc.exists()) throw new Error("Task not found");
            
            const taskData = taskDoc.data();
            const isCompleted = !taskData.completed;
            const now = new Date();
            
            // Get current user data to update coins
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const currentCoins = userData.coins || 0;
            const taskCoins = taskData.coins || 5;
            
            // Update task
            await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
                completed: isCompleted,
                lastCompleted: isCompleted ? now : null
            });
            
            // Update user coins
            if (isCompleted) {
                await updateDoc(doc(db, "users", user.uid), {
                    coins: currentCoins + taskCoins
                });
            } else {
                await updateDoc(doc(db, "users", user.uid), {
                    coins: Math.max(0, currentCoins - taskCoins)
                });
            }
            
            return isCompleted;
        } catch (error) {
            console.error("Error toggling task completion:", error);
            throw error;
        }
    }
}

// Authentication State Management
export class AuthManager {
    static onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    }

    static async signOut() {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    }

    static getCurrentUser() {
        return auth.currentUser;
    }
}

// Simple Real-time Data Listeners (MVP version)
export class RealtimeManager {
    static listenToUserStats(userId, callback) {
        return onSnapshot(doc(db, "users", userId), (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            }
        });
    }

    static listenToTasks(userId, callback) {
        const tasksQuery = query(collection(db, "users", userId, "tasks"));
        return onSnapshot(tasksQuery, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(tasks);
        });
    }
} 