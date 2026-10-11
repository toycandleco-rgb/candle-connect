# Candle Expo Billing & Customer Book

Build a mobile-first, owner-only billing app for the candle expo.

## What it will do
- Create a quick bill by entering candle names, prices, and quantities; calculate the total in INR (₹).
- Enter or select a customer by name and WhatsApp number, save their contact in the customer book, and open WhatsApp with a simple text-only bill ready to send.
- Find saved customers later and prepare a personal offer message for a customer who has opted in. The owner reviews and sends each message in WhatsApp; the app will not send messages automatically or create a PDF/fancy invoice.
- Keep customer details and completed bills in the database so they remain available after the expo.

## Experience
- Put billing first, with large touch-friendly controls and a clear total/send action suited to a phone at a busy stall.
- Include a customer-book view for searching contacts and starting an individual offer message.
- Use a straightforward owner sign-in so customer phone numbers are not exposed publicly.

## Technical details
- Use Lovable Cloud for persistent customer and bill records, with access restricted to the signed-in owner.
- Use a WhatsApp click-to-chat link with properly encoded plain text; sending happens in WhatsApp after the owner reviews it.
- Add route-specific page metadata and validate bill/customer inputs before saving or composing messages.
