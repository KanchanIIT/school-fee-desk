# School Fee Desk 2.0

A Windows/macOS desktop application for small schools to digitize fee collection and receipts.

## Staff workflow
1. Open the app and enter the staff PIN.
2. Add/import students into PG, Nursery, Jr KG, or Sr KG.
3. Record monthly/admission/other fee payments.
4. The app creates a PDF receipt automatically.
5. If cloud is connected, the PDF is uploaded and the WhatsApp message contains a public receipt link.
6. Use Dashboard, Payment Ledger, Pending Fees, and Excel Export for bookkeeping.

## Features
- Staff PIN lock
- Student master with active/inactive status
- Four classes: PG / Nursery / Jr KG / Sr KG
- Monthly/admission/annual/exam/transport/other fees
- Unique PDF receipts
- WhatsApp receipt sharing
- Pending monthly-fee list + reminder messages
- Class/month filters
- Excel workbook: Dashboard, all payments, each class, pending fees
- Local backups
- Offline-first local data
- Supabase cloud login, synchronization, and public invoice PDF storage
- Windows and macOS build definitions

## Cloud setup (one-time owner/admin task)
The application itself cannot create a third-party cloud account automatically. Create a Supabase project, run `supabase-setup.sql` in its SQL Editor, create one Email/Password user, then paste the Project URL and anon public key into **Settings & Cloud** in the app. Sign in with the created school user. After this, normal staff do not need technical setup.

## Build installers
```bash
npm install
npm run dist:win
npm run dist:mac
```
For reliable native installers, build Windows on a Windows runner and macOS on a macOS runner. `.github/workflows/build.yml` does this automatically in GitHub Actions and uploads the installers as build artifacts.

## Local files
- App data: Electron userData folder
- Receipts: Documents/School Fee Desk/Invoices
- Backups: Documents/School Fee Desk/Backups
