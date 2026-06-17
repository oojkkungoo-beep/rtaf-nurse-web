// ตั้งค่าหลัก — แก้ค่าเหล่านี้หลัง deploy Apps Script
const CONFIG = {
  // URL ของ Google Apps Script Web App (ใส่หลัง deploy)
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',

  // Google OAuth Client ID (สร้างที่ Google Cloud Console)
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  // Admins ที่อนุญาต (Google email)
  ADMIN_EMAILS: [
    'nurse.rtafnc@gmail.com',
    'oojkkungoo@gmail.com'
  ],

  ITEMS_PER_PAGE: 20,
};
