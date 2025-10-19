require('dotenv').config();

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mainprogdia.firebaseio.com"
});

const db = admin.firestore();

// Stripe webhook endpoint
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'whsec_your_webhook_secret_here'; // Replace with your webhook secret

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleSuccessfulPayment(session);
      break;
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      await handleSubscriptionCancellation(deletedSubscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Handle successful payment
async function handleSuccessfulPayment(session) {
  try {
    const customerEmail = session.customer_details.email;
    const amount = session.amount_total;
    const currency = session.currency;
    
    // Determine subscription type based on amount
    let subscriptionType = 'monthly';
    let durationDays = 30;
    
    if (amount === 199) { // $1.99 in cents
      subscriptionType = 'monthly';
      durationDays = 30;
    } else if (amount === 1499) { // $14.99 in cents
      subscriptionType = 'annual';
      durationDays = 365;
    }

    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', customerEmail).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
      
      // Calculate expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + durationDays);
      
      // Update user with premium status
      await userDoc.ref.update({
        isPremium: true,
        subscriptionType: subscriptionType,
        premiumExpirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
        stripeCustomerId: session.customer,
        lastPaymentDate: admin.firestore.Timestamp.now()
      });

      console.log(`Premium subscription activated for user: ${userId}`);
    } else {
      console.log(`User not found for email: ${customerEmail}`);
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      
      if (subscription.status === 'active') {
        // Subscription is active, extend premium status
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        
        await userDoc.ref.update({
          isPremium: true,
          premiumExpirationDate: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
          subscriptionStatus: subscription.status
        });
      } else {
        // Subscription is not active, remove premium status
        await userDoc.ref.update({
          isPremium: false,
          subscriptionStatus: subscription.status
        });
      }
      
      console.log(`Subscription updated for user: ${userDoc.id}`);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      
      // Remove premium status
      await userDoc.ref.update({
        isPremium: false,
        subscriptionStatus: 'cancelled'
      });
      
      console.log(`Premium subscription cancelled for user: ${userDoc.id}`);
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Function to check and update expired subscriptions (run daily)
async function checkExpiredSubscriptions() {
  try {
    const now = admin.firestore.Timestamp.now();
    
    // Find users with expired premium subscriptions
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('isPremium', '==', true)
      .where('premiumExpirationDate', '<', now)
      .get();
    
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isPremium: false,
        subscriptionStatus: 'expired'
      });
    });
    
    await batch.commit();
    console.log(`Updated ${snapshot.docs.length} expired subscriptions`);
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
}

// Run subscription check every 24 hours
setInterval(checkExpiredSubscriptions, 24 * 60 * 60 * 1000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
