# SV8C ID System — South Ville 8C National High School

## QUICK START (3 steps)

### Step 1 — Database
1. Open XAMPP → Start Apache + MySQL
2. Go to http://localhost/phpmyadmin
3. Click SQL tab → Open `database/schema.sql` in Notepad → Copy all → Paste → Click Go

### Step 2 — Install
```
npm install
```

### Step 3 — Run
```
npm run dev
```
Open: **http://localhost:3000**

---

## LOGIN SYSTEM

### 3 Login Types on the login page:

| Type | Who | How |
|------|-----|-----|
| Faculty | Teaching staff | Register first, then login |
| Staff | Non-teaching staff | Register first, then login |
| Admin | System admins | Hardcoded accounts only |

### Admin Accounts (Hardcoded):
| Admin ID | Password |
|----------|----------|
| ADMIN1 | SvA!#1234XQW |
| ADMIN2 | RtB@&5678PLM |
| ADMIN3 | YnC$*2468KTR |
| ADMIN4 | QpD%^1357WEX |

---

## FLOW

### Faculty/Staff flow:
1. Go to login page → Click Faculty or Staff → Click "Register here"
2. Fill out form (name, department, contact, photo, signature, create username+password)
3. Submit → "Wait for Admin to generate your ID"
4. Admin logs in → Faculty Submit or Staff Submit → Approves the form
5. Admin goes to Create ID → Selects person → Downloads PDF

### Admin flow:
1. Login page → Click Admin → Enter ADMIN1 + SvA!#1234XQW
2. See Dashboard (Home) with stats
3. Faculty Submit / Staff Submit — view and approve/reject submissions
4. Create ID — generate and download ID cards as PDF
5. Settings — toggle dark/light mode, view admin accounts

---

## MENU
- **Home** — Stats: total IDs, faculty IDs this year, staff IDs, live time/date, logged-in admin
- **Faculty Submit** — All faculty submissions, approve/reject, view details
- **Staff Submit** — All staff submissions, approve/reject, view details
- **Create ID** — Select faculty or staff → flip card preview → Download PDF
- **Settings** — Dark/light mode, admin accounts, system info

---

## ID CARDS
- Faculty: Blue/dark theme
- Staff: Green/dark theme
- Back: QR code + UID fallback
- Size: 86mm × 54mm (CR80)
- PDF: A4 landscape

## TECH STACK (All Free)
Next.js 15 · TypeScript · MySQL (XAMPP) · NextAuth.js · bcryptjs · qrcode · jsPDF · Framer Motion · Tailwind CSS
