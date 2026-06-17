// ตั้งค่าหลัก — แก้ค่าเหล่านี้หลัง deploy Apps Script
const CONFIG = {
  // URL ของ Google Apps Script Web App (ใส่หลัง deploy)
  API_URL: 'https://script.google.com/macros/s/AKfycbwvvFCPdU7Qrvel1rrBedsqxyC-4rq5PhV9I-1uPOPT9WQrvIYx26-HZoNv_-tKWi65/exec',

  // Google OAuth Client ID (สร้างที่ Google Cloud Console)
  GOOGLE_CLIENT_ID: '894799186085-mrn3jfvp4n31clvoc13qk7boicvdlikr.apps.googleusercontent.com',

  // Admins ที่อนุญาต (Google email)
  ADMIN_EMAILS: [
    'nurse.rtafnc@gmail.com',
    'oojkkungoo@gmail.com'
  ],

  ITEMS_PER_PAGE: 20,
};
