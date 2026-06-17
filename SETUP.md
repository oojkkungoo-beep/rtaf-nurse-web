# คู่มือ Setup — ชุมนุมศิษย์พยาบาลทหารอากาศ Web App

## ขั้นตอนที่ 1: เตรียม Google Sheets

1. Login ด้วย `nurse.rtafnc@gmail.com`
2. เปิดไฟล์ Excel ที่มีอยู่ แล้ว Import ขึ้น Google Sheets
   - Google Sheets → File → Import → Upload
   - ตั้งชื่อ: **"ระบบสมาชิก ชศพอ."**
3. Share ให้ `oojkkungoo@gmail.com` เป็น Editor
4. สร้าง Sheet เพิ่ม: **News**, **Pending**, **Logbooks** (ถ้ายังไม่มี)

## ขั้นตอนที่ 2: Deploy Google Apps Script

1. เปิด Google Sheets → Extensions → Apps Script
2. ลบโค้ดเดิมทิ้ง แล้ว copy โค้ดจาก `apps-script/Code.gs` วางแทน
3. Deploy → **New deployment**
   - Type: **Web app**
   - Execute as: **Me (nurse.rtafnc@gmail.com)**
   - Who has access: **Anyone**
4. คัดลอก **Web app URL** ที่ได้ (หน้าตาแบบ `https://script.google.com/macros/s/AKfy.../exec`)

## ขั้นตอนที่ 3: ตั้งค่า Google OAuth

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง Project ใหม่ชื่อ "RTAF Nurse"
3. APIs & Services → Credentials → **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://nurse.rtafnc.github.io`
     - `http://localhost:8080` (สำหรับทดสอบ)
4. คัดลอก **Client ID**

## ขั้นตอนที่ 4: ใส่ค่าใน config.js

แก้ไฟล์ `js/config.js`:

```js
const CONFIG = {
  API_URL: 'วาง Web app URL ที่นี่',
  GOOGLE_CLIENT_ID: 'วาง Client ID ที่นี่',
  ...
};
```

## ขั้นตอนที่ 5: Deploy บน GitHub Pages

```bash
cd D:\Claude_Cowork\rtaf-nurse-web
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/nurse-rtafnc/nurse.rtafnc.github.io.git
git push -u origin main
```

จากนั้น:
- GitHub → Repository Settings → Pages
- Source: **Deploy from branch** → main → / (root)
- เว็บจะขึ้นที่ `https://nurse.rtafnc.github.io`

## ขั้นตอนที่ 6: ทดสอบ

- [ ] หน้าหลัก — แสดง stats และข่าว
- [ ] ค้นหาสมาชิก — ค้นชื่อ/รุ่นได้
- [ ] สมัครสมาชิก — ฟอร์มส่งข้อมูลได้
- [ ] Admin Login — Google Login ใช้ได้เฉพาะ admin email
- [ ] Admin: อนุมัติใบสมัคร → ย้ายเข้า Members sheet
- [ ] Admin: บันทึก Logbook สวัสดิการ

## โครงสร้างไฟล์

```
rtaf-nurse-web/
├── index.html          ← หน้าหลัก + ข่าว
├── members.html        ← ค้นหาสมาชิก
├── register.html       ← สมัครสมาชิก
├── admin/
│   └── index.html      ← Admin Panel (Google Login)
├── css/style.css
├── js/
│   ├── config.js       ← ⚠️ ต้องแก้ API_URL และ GOOGLE_CLIENT_ID
│   ├── auth.js
│   ├── api.js
│   └── ui.js
└── apps-script/
    └── Code.gs         ← วางใน Google Apps Script
```
