# ชศพอ. Web App — Project Guide

## Tech Stack
- **Frontend:** HTML/CSS/JS (Vanilla) → GitHub Pages
- **Backend:** Google Apps Script (doGet/doPost)
- **Database:** Google Sheets (3,512+ สมาชิก)
- **Auth:** Google OAuth (GSI)

## URLs
- **Site:** https://oojkkungoo-beep.github.io/rtaf-nurse-web/
- **API:** https://script.google.com/macros/s/AKfycbysEWdIFN25qayS82Bfoi-mae9RG5MtOb92JKKNhqMgDIlfCDtazpIAybtAfH5EZcwS/exec
- **Spreadsheet:** https://docs.google.com/spreadsheets/d/1Z4bYmol5qtVGQNDWAEHrNHyZyGLlqHncFJWPPxqY7Qw/
- **Apps Script Editor:** https://script.google.com/u/0/home/projects/1tCcOeEjS9qoV6ra4G51Dp8xtrCWzt7lOoly8vdgUePOGRP0LGUxWaO5O/edit

## File Structure
```
index.html          — หน้าหลัก (ข่าว + stats)
members.html        — ค้นหาสมาชิก (read-only)
register.html       — ใบสมัครสมาชิก
admin/index.html    — Admin Panel (login + จัดการทุกอย่าง)

js/config.js        — API URL, ADMIN_EMAILS, CONFIG
js/ui.js            — escHtml, formatDate, showToast, renderPagination
js/api.js           — API object (getNews, searchMembers, ฯลฯ), apiGet, apiPost
js/auth.js          — Google OAuth helpers
js/home.js          — logic ของ index.html
js/members.js       — logic ของ members.html

apps-script/รหัส.js — Apps Script ทั้งหมด (doGet, doPost, helper functions)
```

## Sheets Schema (Members)
COL: ROW(0) ID(1) RANK(2) FNAME(3) LNAME(4) GEN(5) TYPE(6) WORKPLACE(7) INST(8) ADDR(9) PHONE(10) STATUS(11) IMAGE(12) BIRTHDATE(13) WORK_PHONE(14) HOME_PHONE(15) MARITAL(16) SPOUSE(17)

## Sheets Schema (Pending)
COL: id(0) timestamp(1) rank(2) fname(3) lname(4) gen(5) type(6) inst(7) addr(8) mobile_phone(9) email(10) workplace(11) birthdate(12) work_phone(13) home_phone(14) marital(15) spouse(16)

## Deploy Flow (Apps Script)
⚠️ ห้ามใช้ `clasp deploy --deploymentId` — URL จะเสีย

1. `cd apps-script && clasp push --force`
2. Apps Script UI → การทำให้ใช้งานได้ → จัดการ → ✏️ → เวอร์ชันใหม่ → บันทึก
3. URL ไม่เปลี่ยน ไม่ต้องแก้ config.js

## Admin Emails
- oojkkungoo@gmail.com (Jed)
- nurse.rtafnc@gmail.com (เมลชมรม)

## Rules
- ห้าม push โดยไม่ได้รับคำสั่งจาก Jed
- แก้หลายอย่างพร้อมกัน → commit เดียว
- JS logic แยกไว้ใน js/*.js ห้ามใส่ inline ใน HTML
