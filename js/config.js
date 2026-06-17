// ตั้งค่าหลัก — แก้ค่าเหล่านี้หลัง deploy Apps Script
const CONFIG = {
  // URL ของ Google Apps Script Web App (ใส่หลัง deploy)
  API_URL: 'https://script.google.com/macros/s/AKfycbxAjTFwvkDH1ezWKV3hvo_97MSSJOD1hc5Q1h70_5bgDAUex4yiC_jzEQ4Bj6TocMUV/exec',

  // Google OAuth Client ID (สร้างที่ Google Cloud Console)
  GOOGLE_CLIENT_ID: '894799186085-mrn3jfvp4n31clvoc13qk7boicvdlikr.apps.googleusercontent.com',

  // Admins ที่อนุญาต (Google email)
  ADMIN_EMAILS: [
    'nurse.rtafnc@gmail.com',
    'oojkkungoo@gmail.com'
  ],

  ITEMS_PER_PAGE: 20,
};
