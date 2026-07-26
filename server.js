const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const qs = require('qs');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// Cloudinary konfiqurasiyası
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'tiktok-panel-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- DATABASE ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'tiktok_panel',
    waitForConnections: true,
    connectionLimit: 10
});
const db = pool;

const slugify = (text) => {
    return text.toLowerCase()
        .replace(/İ/g, 'i').replace(/I/g, 'i')
        .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
        .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// --- FILE UPLOAD (CLOUDINARY) ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'blog_images',
        format: async (req, file) => {
            const ext = file.originalname.split('.').pop().toLowerCase();
            return ext === 'png' ? 'png' : 'jpg';
        },
        public_id: (req, file) => {
            return Date.now() + '-' + file.originalname.replace(/\s+/g, '-').split('.')[0];
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Yalnız şəkil faylları (jpg, png, gif, webp) yüklənə bilər'));
        }
    }
});

// --- AUTH MIDDLEWARE ---
const requireAuth = (req, res, next) => {
    if (!req.session.adminId) {
        return res.redirect('/admin/login');
    }
    next();
};

const TURKAPI_KEY = process.env.TURKAPI_KEY;
const TURKAPI_URL = process.env.TURKAPI_URL || 'https://turkapi.com/api/v2';

// --- KATEQORİYA TƏMİZLƏMƏ ---
function cleanCategoryName(text) {
    if (!text) return 'Digər';
    let cleaned = text;
    cleaned = cleaned.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
    cleaned = cleaned.replace(/\|.*?\|/g, '');
    cleaned = cleaned.replace(/ᴾʳᵒᵛᶦᵈᵉʳ/gi, '');
    cleaned = cleaned.replace(/\[.*?\]/g, '');
    cleaned = cleaned.replace(/\(.*?\)/g, '');
    cleaned = cleaned.replace(/[➖➕✅❌⚡🚀🛡️⛔❤️🔄📉📍🎬💙💬📺→←↑↓]/g, '');
    cleaned = cleaned.replace(/[=+\-_|/\\]/g, ' ');
    cleaned = cleaned.replace(/Turkapi /gi, '');
    cleaned = cleaned.replace(/Spam On/gi, '');
    cleaned = cleaned.replace(/Spam A?cık/gi, '');
    cleaned = cleaned.replace(/Spam Kapalı/gi, '');
    cleaned = cleaned.replace(/Spam Açık ise = Oto İptal eder/gi, '');
    cleaned = cleaned.replace(/Anlık/gi, 'Ani');
    cleaned = cleaned.replace(/Ani Başlar/gi, 'Ani');
    cleaned = cleaned.replace(/Özel/gi, 'Xüsusi');
    cleaned = cleaned.replace(/Kendi servislerimiz/gi, '');
    cleaned = cleaned.replace(/Kendi hizmetlerimiz/gi, '');
    cleaned = cleaned.replace(/Güncelleme Özel/gi, 'Yenilənmiş');
    cleaned = cleaned.replace(/Garantili/gi, 'Zəmanətli');
    cleaned = cleaned.replace(/Bot Gerçek/gi, 'Bot Real');
    cleaned = cleaned.replace(/OWN/gi, '');
    cleaned = cleaned.replace(/Bayrak Acık Atış Yapar/gi, '');
    cleaned = cleaned.replace(/Flag Shoots Open/gi, '');
    cleaned = cleaned.replace(/Ucuz/gi, '');
    cleaned = cleaned.replace(/İPTAL EDİLMEZ/gi, 'Ləğv edilmir');
    cleaned = cleaned.replace(/LƏĞV EDİLMƏZ/gi, 'Ləğv edilmir');
    cleaned = cleaned.replace(/Açıklamaları Okuyun/gi, '');
    cleaned = cleaned.replace(/Təsvirləri Oxuyun/gi, '');
    cleaned = cleaned.replace(/API/gi, '');
    cleaned = cleaned.replace(/V1/gi, '');
    cleaned = cleaned.replace(/V2/gi, '');
    cleaned = cleaned.replace(/V3/gi, '');
    cleaned = cleaned.replace(/V4/gi, '');
    cleaned = cleaned.replace(/Server/gi, '');
    cleaned = cleaned.replace(/Serveri/gi, '');
    cleaned = cleaned.replace(/S1/gi, '');
    cleaned = cleaned.replace(/S2/gi, '');
    cleaned = cleaned.replace(/S3/gi, '');
    cleaned = cleaned.replace(/Instagram\s*\|/gi, 'Instagram ');
    cleaned = cleaned.replace(/instagram\s*\|/gi, 'Instagram ');
    cleaned = cleaned.replace(/[.,!?:;]+/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 3) return 'Digər';
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return cleaned;
}

function cleanServiceName(name) {
    if (!name) return '';
    let cleaned = name;
    cleaned = cleaned.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
    cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');
    cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
    cleaned = cleaned.replace(/[➖➕✅❌⚡🚀🛡️⛔❤️🔄📉📍🎬💙💬📺→←↑↓]/g, '');
    cleaned = cleaned.replace(/\|.*?\|/g, '');
    cleaned = cleaned.replace(/\[.*?\]/g, '');
    cleaned = cleaned.replace(/\(.*?\)/g, '');
    cleaned = cleaned.replace(/\bmax\s*\d+[\s.,]*\d*\s*[kmb]?\b/gi, '');
    cleaned = cleaned.replace(/\bmin\s*\d+[\s.,]*\d*\s*[kmb]?\b/gi, '');
    cleaned = cleaned.replace(/\b\d+[\s.,]*\d*\s*[kmb]?\s*max\b/gi, '');
    cleaned = cleaned.replace(/\b\d+[\s.,]*\d*\s*[kmb]?\s*min\b/gi, '');
    cleaned = cleaned.replace(/\bmax\b/gi, '');
    cleaned = cleaned.replace(/\bmin\b/gi, '');
    cleaned = cleaned.replace(/\d+\s*%/g, '');
    cleaned = cleaned.replace(/\bserver\s*\d+\b/gi, '');
    cleaned = cleaned.replace(/\bs\d+\b/gi, '');
    cleaned = cleaned.replace(/\bv\d+\b/gi, '');
    cleaned = cleaned.replace(/[=+\-_|/\\]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// --- TƏRCÜMƏ CACHE ---
const CACHE_FILE = path.join(__dirname, 'translate-cache.json');
let translationCache = {};
try {
    if (fs.existsSync(CACHE_FILE)) {
        translationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        console.log(`✅ ${Object.keys(translationCache).length} tərcümə cache-dən yükləndi`);
    }
} catch (e) {
    translationCache = {};
}

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(translationCache, null, 2));
    } catch (e) {
        console.error('Cache yazıla bilmədi:', e.message);
    }
}

async function translateText(text) {
    if (!text || !text.trim()) return text;
    if (translationCache[text]) return translationCache[text];
    try {
        const url = 'https://translate.googleapis.com/translate_a/single';
        const res = await axios.get(url, {
            params: { client: 'gtx', sl: 'tr', tl: 'az', dt: 't', q: text },
            timeout: 5000
        });
        let translated = text;
        if (res.data && res.data[0]) {
            translated = res.data[0].map(item => item[0]).join('');
        }
        translationCache[text] = translated;
        saveCache();
        return translated;
    } catch (err) {
        translationCache[text] = text;
        saveCache();
        return text;
    }
}

async function translateBatch(texts) {
    const unique = [...new Set(texts.filter(t => t && t.trim()))];
    const result = {};
    for (const text of unique) {
        result[text] = translationCache[text] || await translateText(text);
        if (!translationCache[text]) await new Promise(r => setTimeout(r, 300));
    }
    return texts.map(t => result[t] || t);
}

const WANTED_PLATFORMS = [
    { name: 'Instagram', match: ['instagram', 'ig'], icon: 'ri-instagram-line' },
    { name: 'Threads', match: ['threads'], icon: 'ri-threads-line' },
    { name: 'TikTok', match: ['tiktok'], icon: 'ri-tiktok-fill' },
    { name: 'LinkedIn', match: ['linkedin'], icon: 'ri-linkedin-box-fill' },
    { name: 'Twitter', match: ['twitter', 'x '], icon: 'ri-twitter-x-line' },
    { name: 'YouTube', match: ['youtube', 'yt'], icon: 'ri-youtube-fill' },
    { name: 'Telegram', match: ['telegram'], icon: 'ri-telegram-fill' },
    { name: 'Facebook', match: ['facebook', 'fb'], icon: 'ri-facebook-fill' },
    { name: 'Spotify', match: ['spotify'], icon: 'ri-spotify-fill' },
    { name: 'Twitch', match: ['twitch'], icon: 'ri-twitch-fill' },
    { name: 'Snapchat', match: ['snapchat'], icon: 'ri-snapchat-fill' },
    { name: 'Discord', match: ['discord'], icon: 'ri-discord-fill' },
    { name: 'WhatsApp', match: ['whatsapp'], icon: 'ri-whatsapp-fill' },
    { name: 'Pinterest', match: ['pinterest'], icon: 'ri-pinterest-fill' },
    { name: 'Likee', match: ['likee'], icon: 'ri-hearts-fill' },
    { name: 'SoundCloud', match: ['soundcloud'], icon: 'ri-soundcloud-fill' }
];

// --- API ROUTES ---
app.get('/api/platforms', async (req, res) => {
    try {
        const response = await axios.post(TURKAPI_URL, { key: TURKAPI_KEY, action: 'services' });
        const allServices = response.data;
        const platforms = WANTED_PLATFORMS.map(p => {
            const platformServices = allServices.filter(s => {
                const cat = s.category ? s.category.toLowerCase() : '';
                return p.match.some(keyword => cat.includes(keyword));
            });
            return { name: p.name, icon: p.icon, category_count: [...new Set(platformServices.map(s => s.category))].length };
        });
        res.json({ success: true, platforms });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const { platform } = req.query;
        if (!platform) return res.status(400).json({ success: false, error: 'Platform lazımdır' });
        const response = await axios.post(TURKAPI_URL, { key: TURKAPI_KEY, action: 'services' });
        const allServices = response.data;
        const wantedPlatform = WANTED_PLATFORMS.find(p => p.name.toLowerCase() === platform.toLowerCase());
        if (!wantedPlatform) return res.status(404).json({ success: false, error: 'Platform tapılmadı' });
        const platformServices = allServices.filter(s => wantedPlatform.match.some(k => (s.category || '').toLowerCase().includes(k)));
        const cleanedCategories = [...new Set(platformServices.map(s => cleanCategoryName(s.category || 'Digər')))];
        const translatedNames = await translateBatch(cleanedCategories);
        const nameMap = {}; cleanedCategories.forEach((c, i) => nameMap[c] = translatedNames[i]);
        const grouped = {};
        platformServices.forEach(service => {
            const cleanedCat = cleanCategoryName(service.category || 'Digər');
            const catName = nameMap[cleanedCat] || cleanedCat;
            if (!grouped[catName]) grouped[catName] = { name: catName, originals: [], services: [], min_price: parseFloat(service.rate), max_price: parseFloat(service.rate) };
            if (!grouped[catName].originals.includes(service.category)) grouped[catName].originals.push(service.category);
            grouped[catName].services.push(service);
            const rate = parseFloat(service.rate);
            if (rate < grouped[catName].min_price) grouped[catName].min_price = rate;
            if (rate > grouped[catName].max_price) grouped[catName].max_price = rate;
        });
        res.json({ success: true, platform, categories: Object.values(grouped) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/service-types', async (req, res) => {
    try {
        const { platform, category } = req.query;
        if (!platform || !category) return res.status(400).json({ success: false, error: 'Platform və kateqoriya lazımdır' });
        let categoryList; try { categoryList = JSON.parse(category); } catch { categoryList = [category]; }
        const response = await axios.post(TURKAPI_URL, { key: TURKAPI_KEY, action: 'services' });
        const allServices = response.data;
        const wantedPlatform = WANTED_PLATFORMS.find(p => p.name.toLowerCase() === platform.toLowerCase());
        const platformServices = allServices.filter(s => wantedPlatform.match.some(k => (s.category || '').toLowerCase().includes(k)));
        const selectedServices = platformServices.filter(s => categoryList.includes(s.category || 'Digər'));
        const translatedNames = await translateBatch(selectedServices.map(s => s.name));
        const packages = selectedServices.map((s, i) => ({
            id: s.service, name: translatedNames[i] || s.name, original_name: s.name,
            rate: parseFloat(s.rate), min: parseInt(s.min), max: parseInt(s.max),
            description: s.description || '', refill: s.refill || false, cancel: s.cancel || false
        })).sort((a, b) => a.rate - b.rate);
        res.json({ success: true, platform, category: categoryList, count: packages.length, packages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- BLOG API ---
app.get('/api/blog', async (req, res) => {
    try {
        const [posts] = await pool.query("SELECT id, title, slug, category, excerpt, featured_image, views, created_at FROM blog_posts WHERE status = 'published' ORDER BY is_featured DESC, created_at DESC LIMIT 12");
        res.json({ success: true, posts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/blog/:slug', async (req, res) => {
    try {
        const [posts] = await pool.query("SELECT * FROM blog_posts WHERE slug =? AND status = 'published'", [req.params.slug]);
        if (posts.length === 0) return res.status(404).json({ success: false, error: 'Tapılmadı' });
        await pool.query("UPDATE blog_posts SET views = views + 1 WHERE id =?", [posts[0].id]);
        const [related] = await pool.query("SELECT id, title, slug, featured_image, created_at FROM blog_posts WHERE category =? AND id!=? AND status = 'published' LIMIT 3", [posts[0].category, posts[0].id]);
        res.json({ success: true, post: posts[0], related });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- ÖDƏNİŞ SİSTEMİ ---
async function finalizeOrder(internalOrderId) {
    try {
        const [rows] = await db.execute("SELECT * FROM orders WHERE id =?", [internalOrderId]);
        const order = rows[0];
        if (!order || order.status !== 'pending') return;
        await db.execute("UPDATE orders SET status='processing' WHERE id=?", [internalOrderId]);
        let turkOrderId = null;
        if (order.api_service_id) {
            const res = await axios.post(TURKAPI_URL, qs.stringify({ key: TURKAPI_KEY, action: 'add', service: order.api_service_id, link: order.link, quantity: order.quantity }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
            if (res.data?.order) {
                turkOrderId = res.data.order;
                await db.execute("UPDATE orders SET status='completed', api_order_id=? WHERE id=?", [turkOrderId, internalOrderId]);
            } else {
                await db.execute("UPDATE orders SET status='paid_api_error' WHERE id=?", [internalOrderId]);
                return;
            }
        } else {
            await db.execute("UPDATE orders SET status='completed' WHERE id=?", [internalOrderId]);
        }
        try {
            await transporter.sendMail({
                from: `"Tiktok-Panel" <${process.env.EMAIL_USER}>`,
                to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                subject: `✅ Yeni sifariş #${internalOrderId} - ${order.price} AZN`,
                html: `<h3>Yeni ödəniş</h3><p><b>Ad:</b> ${order.customer_name}<br><b>Email:</b> ${order.customer_email}<br><b>Tel:</b> ${order.customer_phone}<br><b>Link:</b> ${order.link}<br><b>Miqdar:</b> ${order.quantity}<br><b>TurkAPI:</b> ${turkOrderId || 'Manual'}</p>`
            });
            if (order.customer_email) {
                await transporter.sendMail({ from: `"Tiktok-Panel" <${process.env.EMAIL_USER}>`, to: order.customer_email, subject: `Sifarişiniz qəbul edildi #${internalOrderId}`, html: `<p>Salam ${order.customer_name}, ödənişiniz alındı. Sifariş icradadır.</p>` });
            }
        } catch (e) { console.error('Mail xətası:', e.message); }
    } catch (e) {
        console.error("finalizeOrder:", e.message);
    }
}

app.post('/api/create-order', async (req, res) => {
    try {
        const { api_service_id, quantity, link, price, customer_name, customer_email, customer_phone } = req.body;
        const [result] = await db.execute("INSERT INTO orders (api_service_id, quantity, link, price, status, customer_name, customer_email, customer_phone) VALUES (?,?,?,?, 'pending',?,?,?)", [api_service_id, quantity, link, price, customer_name, customer_email, customer_phone]);
        const internalId = result.insertId;
        const payload = { public_key: process.env.EPOINT_PUBLIC_KEY, amount: Number(price).toFixed(2), currency: 'AZN', language: 'az', order_id: `${internalId}_${Date.now()}`, description: `Sifariş #${internalId}`, success_redirect_url: `${SITE_URL}/success?internal_id=${internalId}`, error_redirect_url: `${SITE_URL}/error?internal_id=${internalId}` };
        const data = Buffer.from(JSON.stringify(payload)).toString('base64');
        const sign = crypto.createHash('sha1').update(process.env.EPOINT_PRIVATE_KEY + data + process.env.EPOINT_PRIVATE_KEY).digest('base64');
        const ep = await axios.post(`${process.env.EPOINT_API_URL}/request`, { data, signature: sign });
        res.json({ success: true, redirect_url: ep.data.redirect_url });
    } catch (err) {
        console.error('CREATE-ORDER:', err.response?.data || err.message);
        res.status(500).json({ success: false, error: 'Server xətası' });
    }
});

app.post('/api/epoint/result', async (req, res) => {
    try {
        const { data, signature } = req.body;
        const check = crypto.createHash('sha1').update(process.env.EPOINT_PRIVATE_KEY + data + process.env.EPOINT_PRIVATE_KEY).digest('base64');
        if (check !== signature) return res.status(401).send('no');
        const decoded = JSON.parse(Buffer.from(data, 'base64').toString());
        const orderId = decoded.order_id.split('_')[0];
        if (decoded.status === 'success') finalizeOrder(orderId);
        res.send('OK');
    } catch (e) { res.status(500).send('Error'); }
});

app.post('/api/finalize-after-payment', async (req, res) => {
    try {
        const { internal_id } = req.body;
        if (!internal_id) return res.status(400).json({ success: false });
        finalizeOrder(internal_id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// --- ADMIN ROUTES ---
app.get('/admin/login', (req, res) => { if (req.session.adminId) return res.redirect('/admin'); res.render('admin/login', { error: null }); });
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const [users] = await pool.query("SELECT * FROM admin_users WHERE username =?", [username]);
    if (users.length > 0 && await bcrypt.compare(password, users[0].password)) {
        req.session.adminId = users[0].id; req.session.adminUsername = users[0].username; res.redirect('/admin');
    } else { res.render('admin/login', { error: 'İstifadəçi adı və ya şifrə səhvdir' }); }
});
app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });
app.get('/admin', requireAuth, async (req, res) => {
    const [posts] = await pool.query("SELECT * FROM blog_posts ORDER BY created_at DESC");
    res.render('admin/dashboard', { posts, username: req.session.adminUsername, query: req.query });
});
app.get('/admin/add', requireAuth, (req, res) => { res.render('admin/add-post', { post: null }); });
app.post('/admin/add', requireAuth, upload.single('featured_image'), async (req, res) => {
    const { title, category, content, excerpt, status, is_featured, read_time } = req.body;
    const slug = slugify(title);
    const featured_image = req.file ? req.file.path : '';
    await pool.query("INSERT INTO blog_posts (title, slug, category, content, excerpt, featured_image, read_time, status, is_featured) VALUES (?,?,?,?,?,?,?,?,?)", [title, slug, category, content, excerpt, featured_image, read_time || 5, status, is_featured ? 1 : 0]);
    res.redirect('/admin?saved=1');
});
app.get('/admin/edit/:id', requireAuth, async (req, res) => {
    const [posts] = await pool.query("SELECT * FROM blog_posts WHERE id =?", [req.params.id]);
    if (posts.length === 0) return res.redirect('/admin');
    res.render('admin/add-post', { post: posts[0] });
});
app.post('/admin/edit/:id', requireAuth, upload.single('featured_image'), async (req, res) => {
    const { title, category, content, excerpt, status, is_featured, read_time } = req.body;
    const slug = slugify(title);
    let query = "UPDATE blog_posts SET title=?, slug=?, category=?, content=?, excerpt=?, status=?, is_featured=?, read_time=?";
    let params = [title, slug, category, content, excerpt, status, is_featured ? 1 : 0, read_time || 5];
    if (req.file) { query += ", featured_image=?"; params.push(req.file.path); }
    query += " WHERE id=?"; params.push(req.params.id);
    await pool.query(query, params);
    res.redirect('/admin?saved=1');
});
app.get('/admin/delete/:id', requireAuth, async (req, res) => { await pool.query("DELETE FROM blog_posts WHERE id =?", [req.params.id]); res.redirect('/admin?deleted=1'); });

// --- ANA SƏHİFƏ ---
app.get('/', async (req, res) => {
    try {
        const [blogPosts] = await pool.query("SELECT id, title, slug, category, excerpt, featured_image, read_time, created_at FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 3");

        let services = [];
        try {
            const [servicesRows] = await pool.query("SELECT id, platform, name, price, link, sort_order FROM services WHERE is_active = 1 ORDER BY sort_order ASC");
            const grouped = {};
            servicesRows.forEach(s => {
                const key = s.platform.toLowerCase();
                if (!grouped[key]) grouped[key] = { platform: key, items: [] };
                grouped[key].items.push(s);
            });
            services = Object.values(grouped);
        } catch (e) { console.log('Services cədvəli yoxdur'); }

        res.render('index', { blogPosts, services });
    } catch (err) {
        console.error('Ana səhifə xətası:', err);
        res.render('index', { blogPosts: [], services: [] });
    }
});


// --- ADMIN ORDERS MANAGEMENT ---

// Sifarişlərin siyahısı və filtrlənməsi
app.get('/admin/orders', requireAuth, async (req, res) => {
    try {
        const statusFilter = req.query.status || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        let countQuery = "SELECT COUNT(*) as total FROM orders";
        let selectQuery = "SELECT * FROM orders";
        let params = [];

        if (statusFilter) {
            countQuery += " WHERE status = ?";
            selectQuery += " WHERE status = ?";
            params.push(statusFilter);
        }

        selectQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        
        const [[{ total }]] = await pool.query(countQuery, params);
        const [orders] = await pool.query(selectQuery, [...params, limit, offset]);

        res.render('admin/orders', {
            orders,
            username: req.session.adminUsername,
            currentPage: page,
            totalPages: Math.ceil(total / limit) || 1,
            statusFilter,
            query: req.query
        });
    } catch (error) {
        console.error('Admin orders error:', error);
        res.status(500).send('Server xətası baş verdi.');
    }
});

// Statusun əllə (Manual) dəyişdirilməsi
app.post('/admin/orders/update-status/:id', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'completed', 'paid_api_error', 'canceled'];
        
        if (!validStatuses.includes(status)) {
            return res.redirect('/admin/orders?error=invalid_status');
        }

        await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id]);
        res.redirect('/admin/orders?updated=1');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/orders?error=server');
    }
});

// Canlı TurkAPI Statusunu yoxlamaq və sinxronizasiya etmək
app.get('/admin/orders/sync/:id', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [req.params.id]);
        const order = rows[0];

        if (!order || !order.api_order_id) {
            return res.redirect('/admin/orders?error=no_api_id');
        }

        // TurkAPI-yə status sorğusu göndərilir
        const response = await axios.post(TURKAPI_URL, qs.stringify({
            key: TURKAPI_KEY,
            action: 'status',
            order: order.api_order_id
        }), { 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000 
        });

        if (response.data && response.data.status) {
            let apiStatus = response.data.status.toLowerCase();
            let newStatus = order.status;

            // Gələn statusa uyğun verilənlər bazasının yenilənməsi
            if (apiStatus.includes('completed') || apiStatus.includes('success')) {
                newStatus = 'completed';
            } else if (apiStatus.includes('processing') || apiStatus.includes('inprogress') || apiStatus.includes('pending')) {
                newStatus = 'processing';
            } else if (apiStatus.includes('canceled') || apiStatus.includes('cancelled') || apiStatus.includes('partial')) {
                newStatus = 'canceled';
            }

            await pool.query("UPDATE orders SET status = ? WHERE id = ?", [newStatus, order.id]);
            return res.redirect('/admin/orders?synced=1');
        }

        res.redirect('/admin/orders?error=api_failed');
    } catch (error) {
        console.error('API Sync Error:', error.message);
        res.redirect('/admin/orders?error=server');
    }
});

// --- YENİ: Sifarişi API-yə Yenidən Göndərmək (Retry) ---
app.post('/admin/orders/retry-api/:id', requireAuth, async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Sifarişi bazadan tapırıq
        const [rows] = await db.execute("SELECT * FROM orders WHERE id = ?", [orderId]);
        const order = rows[0];

        // Şərtlər: Sifariş mövcuddurmu? Və ya artıq API-də varmı?
        if (!order) {
            return res.redirect('/admin/orders?error=not_found');
        }
        if (order.api_order_id) {
            return res.redirect('/admin/orders?error=already_has_api_id');
        }
        if (order.status !== 'paid_api_error') {
            return res.redirect('/admin/orders?error=invalid_status_for_retry');
        }

        // TurkAPI-yə yenidən göndəririk
        const response = await axios.post(TURKAPI_URL, qs.stringify({ 
            key: TURKAPI_KEY, 
            action: 'add', 
            service: order.api_service_id, 
            link: order.link, 
            quantity: order.quantity 
        }), { 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
            timeout: 20000 
        });

        // Cavabı yoxlayırıq
        if (response.data && response.data.order) {
            const turkOrderId = response.data.order;
            // Əgər uğurludursa, api_order_id yazılır və status 'completed' (və ya 'processing') olur
            await db.execute("UPDATE orders SET status='processing', api_order_id=? WHERE id=?", [turkOrderId, orderId]);
            return res.redirect('/admin/orders?retried=1');
        } else {
            // Əgər yenə balans yoxdursa və ya xəta verdisə
            console.error("TurkAPI Retry Xətası:", response.data);
            return res.redirect('/admin/orders?error=api_retry_failed');
        }
    } catch (error) {
        console.error("Retry Error:", error.message);
        res.redirect('/admin/orders?error=server');
    }
});

// --- STATİK SƏHİFƏLƏR ---
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/platforms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'platforms.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public', 'services.html')));
app.get('/service-types', (req, res) => res.sendFile(path.join(__dirname, 'public', 'service-types.html')));
app.get('/packages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'packages.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'public', 'success.html')));
app.get('/error', (req, res) => res.sendFile(path.join(__dirname, 'public', 'error.html')));
app.get('/404', (req, res) => res.sendFile(path.join(__dirname, 'public', '404.html')));

// --- BLOG ---
app.get('/blog', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const offset = (page - 1) * limit;

        const [[{ total }]] = await pool.query(
            "SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published'"
        );
        const [posts] = await pool.query(
            `SELECT * FROM blog_posts WHERE status = 'published' ORDER BY is_featured DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}`
        );

        res.render('blog', {
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (err) {
        console.error(err);
        res.render('blog', { posts: [], currentPage: 1, totalPages: 1, total: 0 });
    }
});

app.get('/blog/:slug', async (req, res) => {
    const [posts] = await pool.query("SELECT * FROM blog_posts WHERE slug =? AND status = 'published'", [req.params.slug]);
    if (posts.length === 0) return res.status(404).send('Tapılmadı');
    await pool.query("UPDATE blog_posts SET views = views + 1 WHERE id =?", [posts[0].id]);
    const [related] = await pool.query("SELECT id, title, slug, featured_image FROM blog_posts WHERE category =? AND id!=? AND status = 'published' LIMIT 3", [posts[0].category, posts[0].id]);
    res.render('blog-details', { post: posts[0], related });
});

// --- SERVICES ADMIN ---
app.get('/admin/services', requireAuth, async (req, res) => {
    const [services] = await pool.query("SELECT * FROM services ORDER BY sort_order ASC, id DESC");
    res.render('admin/services', { services, username: req.session.adminUsername, query: req.query });
});

app.get('/admin/services/add', requireAuth, (req, res) => {
    res.render('admin/add-service', { service: null });
});

app.post('/admin/services/add', requireAuth, async (req, res) => {
    const { platform, name, price, link, sort_order, is_active } = req.body;
    await pool.query(
        "INSERT INTO services (platform, name, price, link, sort_order, is_active) VALUES (?,?,?,?,?,?)",
        [platform, name, price, link || '', sort_order || 0, is_active ? 1 : 0]
    );
    res.redirect('/admin/services?saved=1');
});

app.get('/admin/services/edit/:id', requireAuth, async (req, res) => {
    const [services] = await pool.query("SELECT * FROM services WHERE id =?", [req.params.id]);
    if (services.length === 0) return res.redirect('/admin/services');
    res.render('admin/add-service', { service: services[0] });
});

app.post('/admin/services/edit/:id', requireAuth, async (req, res) => {
    const { platform, name, price, link, sort_order, is_active } = req.body;
    await pool.query(
        "UPDATE services SET platform=?, name=?, price=?, link=?, sort_order=?, is_active=? WHERE id=?",
        [platform, name, price, link || '', sort_order || 0, is_active ? 1 : 0, req.params.id]
    );
    res.redirect('/admin/services?saved=1');
});

app.get('/admin/services/delete/:id', requireAuth, async (req, res) => {
    await pool.query("DELETE FROM services WHERE id =?", [req.params.id]);
    res.redirect('/admin/services?deleted=1');
});

// --- SEO ROUTES ---
app.get('/:platform/:category/:service', (req, res) => res.sendFile(path.join(__dirname, 'public', 'packages.html')));
app.get('/:platform/:category', (req, res) => res.sendFile(path.join(__dirname, 'public', 'service-types.html')));
app.get('/:platform', (req, res) => res.sendFile(path.join(__dirname, 'public', 'services.html')));

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
