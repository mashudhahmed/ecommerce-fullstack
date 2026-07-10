// app/terms/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | SnapCart',
  description: 'Read our terms and conditions',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2>1. Acceptance of Terms</h2>
      <p>By using SnapCart, you agree to these terms...</p>
      
      <h2>2. User Accounts</h2>
      <p>You must be 18+ to create an account...</p>
      
      <h2>3. Products and Orders</h2>
      <p>All products are subject to availability...</p>
      
      <h2>4. Payments</h2>
      <p>All payments are processed securely...</p>
      
      <h2>5. Refunds and Returns</h2>
      <p>Returns accepted within 30 days...</p>
      
      <h2>6. Contact</h2>
      <p>support@snapcart.com</p>
    </div>
  );
}