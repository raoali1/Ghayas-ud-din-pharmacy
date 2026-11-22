# Ghayas Ud Din Pharmacy & Mart — Management App

A responsive React + Vite + Supabase starter for pharmacy operations. It runs in a browser on desktop and Android; it can be installed as a PWA after adding a manifest/service worker.

## Included
- Supabase email/password sign-in
- Dashboard: today's sales, expenses, patient visits, estimated gross profit
- Medicine stock register and low-stock indicator
- Sales register
- Purchase register
- Patient visit / consultation-fee register (default Rs. 200)
- Expense register
- Basic reports
- English / Urdu language toggle
- Responsive desktop/mobile layout

## Setup

1. Create a Supabase project at https://supabase.com.
2. In Supabase Dashboard, open **SQL Editor**, paste and run `supabase/schema.sql`.
3. In **Authentication > Providers**, enable Email. Disable public sign-ups.
4. In **Authentication > Users**, create an authorized user for the pharmacy operator.
5. Copy `.env.example` to `.env` and fill:
   - `VITE_SUPABASE_URL` — Project URL
   - `VITE_SUPABASE_ANON_KEY` — publishable/anon key (safe for browser use with RLS)
6. Install Node.js 20+ then run:

   ```bash
   npm install
   npm run dev
   ```

7. For a production build:

   ```bash
   npm run build
   ```

   Upload the generated `dist/` folder to Netlify, Vercel, or another static host. Set the same environment variables in the host dashboard.

## Important limitations before live pharmacy use

- This is a working starter, not a fully validated pharmacy POS. Sales and purchase entries currently record summary lines; they do not automatically deduct/add product stock or calculate itemized invoices.
- Patient visit records store the fee amount, but the daily dashboard's patient total is not a doctor-fee payout ledger. Confirm the actual agreement and accounting treatment with your accountant.
- The current SQL policies allow all authenticated users to manage all rows. Keep sign-in restricted to trusted users. Before adding multiple staff accounts, implement role-based access and audit logs.
- Do not store diagnoses, prescriptions, CNICs, or sensitive medical details unless necessary and legally appropriate.
- Configure Supabase backups and test a restore before relying on it for business-critical records.
- The app does not contain Supabase credentials. You must connect your own project before cloud login/data works.

## Next recommended development
1. Itemized invoices linked to products and automatic stock movements.
2. Separate Abu consultation count and daily payout ledger.
3. Supplier balances, customer credit ledger, returns and expiry alerts.
4. CSV/Excel export, audit log, role-based staff permissions and Urdu field translations.
