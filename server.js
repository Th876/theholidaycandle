import express from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import session from 'express-session';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 4242;
const YOUR_DOMAIN = process.env.YOUR_DOMAIN || `http://localhost:${PORT}`;
const SHIPPING_COST = 799;
const LOCAL_PICKUP_CODE = process.env.LOCAL_PICKUP_CODE || 'HOLIDAYSTAR25';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-09-30.clover' });
const resend = new Resend(process.env.RESEND_API_KEY);


// server.js

// ------------------- Middleware -------------------
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

// ------------------- Session Middleware -------------------
// import MongoStore from 'connect-mongo';

// app.use(session({
//     secret: process.env.SESSION_SECRET || 'changeme',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: process.env.MONGO_URI,        // must be your real Mongo URI
//         collectionName: 'sessions'             // optional, defaults to 'sessions'
//     }),
//     cookie: {
//         secure: process.env.NODE_ENV === 'production',
//         sameSite: 'lax',
//         maxAge: 24 * 60 * 60 * 1000          // 1 day
//     }
// }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: false }
    // cookie: { secure: true, sameSite: 'lax' } // production
    cookie: {
        secure: process.env.NODE_ENV === 'production', // only true on live
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // optional: 1 day
    }
}));

// Disable cache for admin pages
app.use('/admin', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// ------------------- MongoDB -------------------
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) console.warn('⚠️ MONGO_URI not set in .env — some features will fail');

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

const { Schema } = mongoose;

// ------------------- MongoDB Schemas -------------------
const SubscriberSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'subscribers' });

const NotifySchema = new Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    product: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'notifyrequests' });

const ProductSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    stock: { type: Number, required: true, default: 0 },
    price: { type: Number }
}, { collection: 'products' });

const Subscriber = mongoose.model('Subscriber', SubscriberSchema);
const NotifyRequest = mongoose.model('NotifyRequest', NotifySchema);
const Product = mongoose.model('Product', ProductSchema);

// ------------------- Stripe Webhook -------------------
import bodyParser from 'body-parser'; // temporary, only for raw

app.post(
    '/webhook',
    bodyParser.raw({ type: 'application/json' }), // ⚠ raw needed for Stripe signature
    async (req, res) => {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,                   // raw body, NOT parsed JSON
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Only decrement stock on successful payment
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            try {
                const cartItems = JSON.parse(session.metadata.cart || '[]');

                for (const item of cartItems) {
                    await Product.updateOne(
                        { name: item.name.trim() },
                        { $inc: { stock: -Number(item.quantity) } }
                        // { $inc: { stock: -item.quantity } }
                    );
                }

                console.log(`✅ Stock updated for session ${session.id}`);
            } catch (err) {
                console.error('❌ Error updating stock:', err);
            }
        }

        res.json({ received: true });
    }
);

app.use(express.json());
// ------------------- Stock Reservation Helpers -------------------
async function reserveStock(items) {
    const reservedItems = [];
    for (const item of items) {
        const product = await Product.findOne({ name: item.name.trim() });
        if (!product) throw new Error(`Product ${item.name} not found`);
        if (product.stock < item.quantity) {
            throw new Error(`Not enough stock for ${item.name}. Only ${product.stock} left.`);
        }

        // Temporarily reduce stock
        product.stock -= item.quantity;
        await product.save();
        reservedItems.push({ product, quantity: item.quantity });
    }
    return reservedItems;
}

async function releaseStock(reservedItems) {
    for (const { product, quantity } of reservedItems) {
        product.stock += quantity;
        await product.save();
    }
}


// ------------------- Auth Helper -------------------
function requireAdminAuth(req, res, next) {
    if (req.session.authenticated) return next();
    if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.redirect('/admin/login');
}

// ------------------- Publishable Stripe Key Route -------------------
app.get('/stripe-pk', (req, res) => {
    res.json({ pk: process.env.STRIPE_PUBLISHABLE_KEY });
});

// ------------------- Serve static files -------------------
app.use('/admin/assets', express.static(path.join(__dirname, 'public/admin/assets')));
app.use(express.static(path.join(__dirname, 'public')));

// ------------------- Admin Pages -------------------
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin_pages/login.html'));
});

app.get('/admin/dashboard', requireAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin_pages/dashboard.html'));
});

// ------------------- Admin Auth Routes -------------------
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.authenticated = true;
        return res.redirect('/admin/dashboard');
    }
    return res.send('Invalid credentials');
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Logout failed');
        res.json({ success: true });
    });
});

// fetch session details from Stripe
app.get('/checkout-session', async (req, res) => {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        res.json(session); // returns JSON for your frontend
    } catch (err) {
        console.error('❌ Error fetching session:', err);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// ------------------- Stock Routes -------------------
app.get('/stock', async (req, res) => {
    try {
        const products = await Product.find({}, { name: 1, stock: 1 }).lean();
        const map = {};
        products.forEach(p => map[p.name.trim()] = p.stock);
        res.json(map);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching stock' });
    }
});

app.post('/admin/update-stock', requireAdminAuth, async (req, res) => {
    try {
        const { name, stock } = req.body;
        if (!name || stock == null) return res.status(400).send('Invalid');

        const updated = await Product.findOneAndUpdate(
            { name: name.trim() },
            { stock: Number(stock) },
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });

        res.json({ success: true, product: updated });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// ------------------- Subscribe / Notify -------------------

// Subscribe
app.post("/subscribe", async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Invalid email.' });

        const existing = await Subscriber.findOne({ email });
        if (existing) return res.json({ success: false, message: 'Email already exists.' });

        await Subscriber.create({ email });

        if (process.env.ADMIN_NOTIFICATION_EMAIL) {
            await resend.emails.send({
                from: 'no-reply@yourdomain.com',
                to: process.env.ADMIN_NOTIFICATION_EMAIL,
                subject: 'New subscriber',
                html: `<p>New subscriber: ${email}</p>`,
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('subscribe error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Notify
app.post("/notify", async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const product = (req.body.product || '').trim();
        if (!email || !product) return res.status(400).send('Missing fields');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
        if (!emailRegex.test(email)) return res.status(400).send('Invalid email');

        const dup = await NotifyRequest.findOne({ email, product });
        if (dup) return res.status(409).send('Duplicate entry');

        await NotifyRequest.create({ email, product });



        if (process.env.ADMIN_NOTIFICATION_EMAIL) {
            await resend.emails.send({
                from: 'no-reply@yourdomain.com',
                to: process.env.ADMIN_NOTIFICATION_EMAIL,
                subject: `Notify request: ${product}`,
                html: `<p>Notify request: ${email} for product: ${product}</p>`,
            });
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('notify error:', err);
        res.status(500).send('Server error');
    }
});

// ------------------- Stripe Checkout Session -------------------
app.post('/create-checkout-session', async (req, res) => {
    const { items, pickupCode, deliveryMethod, customerEmail } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    let reservedItems = [];
    try {

        // Convert items to Stripe line items
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    ...(item.description ? { description: item.description } : {}),
                    ...(item.image ? { images: [item.image] } : {}),
                },
                unit_amount: Math.round(Number(item.price) * 100),
            },
            quantity: Number(item.quantity),
        }));

        const isLocalPickup = deliveryMethod === 'Local Pickup';
        const shippingOptions = isLocalPickup
            ? [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Local Pickup — Free' } }]
            : [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: SHIPPING_COST, currency: 'usd' }, display_name: 'USPS Priority Mail' } }];

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            customer_email: customerEmail || undefined,
            shipping_address_collection: isLocalPickup ? undefined : { allowed_countries: ['US'] },
            shipping_options: shippingOptions,
            line_items: lineItems,
            success_url: `${YOUR_DOMAIN}/return.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/cart.html`,
            metadata: {
                cart: JSON.stringify(items),
                delivery_method: deliveryMethod || (pickupCode === LOCAL_PICKUP_CODE ? 'Local Pickup' : 'USPS Priority Mail')
            },
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('❌ Stripe session creation error:', err);

        // If reservation failed or session creation failed, release stock
        if (reservedItems.length) await releaseStock(reservedItems);

        res.status(400).json({ error: err.message });
    }
});



// ------------------- Health Check -------------------
app.get('/ping', (req, res) => res.send('OK'));

// ------------------- Start Server -------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
