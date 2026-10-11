# Candle Expo Sales & Billing

Build a phone-friendly tool for managing candle products and recording expo sales.

## What it will do
- Maintain a product list with each candle's name, cost price, and sale price in INR (₹).
- Start a sale, select a customer or add their name and WhatsApp number, add one or more products with quantities, and record sale-related expenses.
- Calculate the bill total, product cost, expenses, and profit for each sale; show overall sales, expenses, and profit totals.
- Save completed sales and customer contacts in Lovable Cloud. Preserve each sale's original product prices and costs so later product price edits do not change past profit reports.
- Prepare a simple text-only bill in WhatsApp for the owner to review and send.
- Search the saved customer list and prepare individual offer messages in WhatsApp; sending remains a manual action in WhatsApp.

## Experience
- Make the sale-entry screen the first view, with large touch-friendly controls and a clear running total.
- Provide clear product-management, sales-summary, and customer-list views without cluttering the quick billing flow.
- Require owner sign-in so customer contact details and business records stay private.

## Technical details
- Use Lovable Cloud for persistent products, customers, sales, sale items, and sale expenses, with access restricted to the signed-in owner.
- Calculate profit as sale revenue minus the recorded cost of products sold and sale expenses.
- Compose WhatsApp click-to-chat links with validated phone numbers and URL-encoded plain text; do not send messages automatically or create PDF invoices.
- Add page-specific metadata and validate product, customer, sale, and expense inputs before saving.
