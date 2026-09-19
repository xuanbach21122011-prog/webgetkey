const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Token Link4M từ ảnh của bạn
const LINK4M_TOKEN = '6a9428f7cfdf872ac83cf502';
const ADMIN_PASSWORD = '21122011';

// Mật khẩu xác thực cho 2 chặng
const STEP1_SECRET = 'SEC_STEP1_89231';
const STEP2_SECRET = 'SEC_STEP2_48123';

// Kho chứa Key
let keyStorage = [];

// Hàm tạo link rút gọn qua Link4M (Theo đúng tài liệu API Link4M)
async function shortenLink4M(destinationUrl) {
    try {
        const apiUrl = `https://link4m.com/api-shorten/v2?api=${LINK4M_TOKEN}&url=${encodeURIComponent(destinationUrl)}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        if (response.data && response.data.status === 'success') {
            return response.data.shortenedUrl;
        } else {
            console.error('Link4M API Error:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Link4M Call Error:', error.message);
        return null;
    }
}

// 1. API Khởi tạo Chặng 1
app.get('/api/step1', async (req, res) => {
    if (keyStorage.length === 0) {
        return res.json({ success: false, message: 'Kho hiện tại đã hết Key! Vui lòng quay lại sau.' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    // Link đích sau khi vượt chặng 1
    const destinationUrl = `${protocol}://${host}/verify-step1?secret=${STEP1_SECRET}`;

    const shortened = await shortenLink4M(destinationUrl);
    if (shortened) {
        return res.json({ success: true, url: shortened });
    } else {
        return res.json({ success: false, message: 'Lỗi kết nối Link4M Chặng 1!' });
    }
});

// 2. Xác thực Chặng 1 -> Chuyển sang Chặng 2
app.get('/verify-step1', async (req, res) => {
    const { secret } = req.query;
    if (secret !== STEP1_SECRET) {
        return res.send('<h3>Xác thực Chặng 1 không hợp lệ!</h3>');
    }

    const host = req.get('host');
    const protocol = req.protocol;
    // Link đích sau khi vượt chặng 2
    const destinationUrl = `${protocol}://${host}/get-key?secret=${STEP2_SECRET}`;

    const shortened = await shortenLink4M(destinationUrl);
    if (shortened) {
        return res.redirect(shortened);
    } else {
        return res.send('<h3>Lỗi tạo link Chặng 2 từ Link4M!</h3>');
    }
});

// 3. Xác thực Chặng 2 -> Trả Key cho người dùng
app.get('/get-key', (req, res) => {
    const { secret } = req.query;
    if (secret !== STEP2_SECRET) {
        return res.send('<h3>Xác thực Chặng 2 không hợp lệ!</h3>');
    }

    if (keyStorage.length === 0) {
        return res.send('<h3>Kho Key vừa hết mất rồi! Vui lòng liên hệ Admin.</h3>');
    }

    // Lấy 1 Key ra khỏi kho
    const userKey = keyStorage.shift();

    res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lấy Key Thành Công</title>
            <style>
                body { background: #090d16; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #0f172a; padding: 30px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.1); width: 90%; max-width: 400px; }
                .key-box { background: #1e293b; color: #38bdf8; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 1.2rem; word-break: break-all; margin: 20px 0; border: 1px dashed #38bdf8; }
                button { background: #38bdf8; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🎉 Chúc Mừng!</h2>
                <p>Bạn đã hoàn thành vượt 2 chặng link.</p>
                <div class="key-box" id="keyText">${userKey}</div>
                <button onclick="navigator.clipboard.writeText('${userKey}'); alert('Đã sao chép Key!')">Sao Chép Key</button>
            </div>
        </body>
        </html>
    `);
});

// 4. API Admin thêm Key
app.post('/api/admin/add-keys', (req, res) => {
    const { password, keys } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.json({ success: false, message: 'Sai mật khẩu Admin!' });
    }

    if (!keys || typeof keys !== 'string') {
        return res.json({ success: false, message: 'Danh sách Key không hợp lệ!' });
    }

    // Phân tách các key bằng dấu |
    const newKeys = keys.split('|').map(k => k.trim()).filter(k => k.length > 0);
    keyStorage.push(...newKeys);

    return res.json({ success: true, message: `Thêm thành công ${newKeys.length} Key! Tổng kho: ${keyStorage.length} Key.` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
