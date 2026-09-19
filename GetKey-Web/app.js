const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cho phép phục vụ các file HTML/CSS/JS trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Port tự động nhận từ Render hoặc mặc định 3000 khi chạy ở máy
const PORT = process.env.PORT || 3000;

// ================= CẤU HÌNH CỦA BẠN =================
const LINK4M_TOKEN = '6a9428f7cfdf872ac83cf502'; // Token Link4M của bạn
const ADMIN_PASS = '21122011';                     // Mật khẩu Admin
// ====================================================

let keyStorage = [];

// Hàm hỗ trợ lấy Domain hiện tại của Server (kể cả Local hay Render)
const getDomain = (req) => {
    return `${req.protocol}://${req.get('host')}`;
};

// 1. CHẶNG 1: Tạo link Link4M lần 1
app.get('/api/step1', async (req, res) => {
    if (keyStorage.length === 0) {
        return res.json({ success: false, message: 'Kho hiện tại đã hết Key!' });
    }
    try {
        const domain = getDomain(req);
        const targetUrl = `${domain}/verify.html`;
        const apiRes = await axios.get(`https://link4m.com/api?api=${LINK4M_TOKEN}&url=${targetUrl}`);
        const shortLink = apiRes.data?.shortenedUrl || apiRes.data?.url;
        if (shortLink) res.json({ success: true, url: shortLink });
        else res.json({ success: false, message: 'Lỗi tạo link Chặng 1! Kiểm tra Token API.' });
    } catch (e) {
        res.json({ success: false, message: 'Lỗi kết nối Link4M Chặng 1!' });
    }
});

// 2. CHẶNG 2: Vượt xong Chặng 1 -> Tạo link Link4M lần 2
app.get('/api/step2', async (req, res) => {
    try {
        const domain = getDomain(req);
        const targetUrl = `${domain}/getkey.html`;
        const apiRes = await axios.get(`https://link4m.com/api?api=${LINK4M_TOKEN}&url=${targetUrl}`);
        const shortLink = apiRes.data?.shortenedUrl || apiRes.data?.url;
        if (shortLink) res.json({ success: true, url: shortLink });
        else res.json({ success: false, message: 'Lỗi tạo link Chặng 2!' });
    } catch (e) {
        res.json({ success: false, message: 'Lỗi kết nối Link4M Chặng 2!' });
    }
});

// 3. API LẤY KEY THẬT (Tự lấy 1 key và xóa khỏi kho)
app.get('/api/get-final-key', (req, res) => {
    if (keyStorage.length === 0) {
        return res.json({ success: false, message: 'Kho đã hết Key!' });
    }
    const userKey = keyStorage.shift();
    res.json({ success: true, key: userKey, remain: keyStorage.length });
});

// 4. API ADMIN UP KEY
app.post('/api/admin/add-keys', (req, res) => {
    const { password, rawKeys } = req.body;
    
    if (password !== ADMIN_PASS) {
        return res.json({ success: false, message: 'Mật khẩu Admin không chính xác!' });
    }
    
    const newKeys = rawKeys.split('|').map(k => k.trim()).filter(k => k.length > 0);
    keyStorage.push(...newKeys);
    res.json({ success: true, added: newKeys.length, total: keyStorage.length });
});

// Khởi chạy Server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại Port: ${PORT}`);
});