# SV8C ID System — Setup Guide

## Step 1 — Install Dependencies
```bash
npm install
```
This is required every time you get a fresh zip. 
Also installs the new `@imgly/background-removal` package.

## Step 2 — Set Up Database (XAMPP)
1. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
2. Create a new database named `sv8cidsystem`
3. Click the database → click **Import**
4. Import `database/schema.sql`
5. **If upgrading from v1/v2:** also run `database/migration_v3.sql`

## Step 3 — Configure Environment
Edit `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
```
**If you access the app from another device on your network:**
```env
NEXTAUTH_URL=http://192.0.0.168:3000
```
Replace `192.0.0.168` with the actual IP of your PC.

## Step 4 — Start the App
```bash
npm run dev
```
Open: `http://localhost:3000` (or your network IP)

---

## Troubleshooting — Blank / No Display

### Check 1: Is the server running?
Look at the terminal. You should see:
```
▲ Next.js 15.x.x
- Local:   http://localhost:3000
- Network: http://192.0.0.168:3000
✓ Ready in Xs
```
If you see errors — paste them here.

### Check 2: Open browser DevTools (F12)
- Click **Console** tab
- Look for red errors
- Most common: `Module not found` → run `npm install`

### Check 3: NEXTAUTH_URL mismatch
If you access via `http://192.0.0.168:3000` but `.env.local` says `NEXTAUTH_URL=http://localhost:3000`, login will silently fail (blank after clicking Sign In).

**Fix:** Change `NEXTAUTH_URL` in `.env.local` to match your access URL, then restart `npm run dev`.

### Check 4: Database not running
Make sure XAMPP's **MySQL** service is started (green light in XAMPP Control Panel).

### Check 5: Database not imported
If you see a database error in the terminal, the schema wasn't imported yet. Follow Step 2 above.

---

## Admin Login Credentials
| Username | Password | Role |
|---|---|---|
| `superadmin` | `sv8c_superadmin_2025` | Super Admin |
| `admin1` | `sv8c_admin1_2025` | Admin |
| `admin2` | `sv8c_admin2_2025` | Admin |

Change these in `.env.local` before going live.

---

## What's New in v3
- **Student portal** with AI background removal
- **Grade 7–10 sections** configurable in Settings  
- **Grade/Section ID progress grid** on Dashboard
- **8 IDs per A4** with real QR codes in PDF
- **Dark/Light mode** across all pages
- **School name + accent color** customizable in Settings
