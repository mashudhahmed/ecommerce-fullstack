// app/privacy/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | SnapCart',
  description: 'Read our privacy policy',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly...</p>
      
      <h2>2. How We Use Information</h2>
      <p>We use information to provide services...</p>
      
      <h2>3. Information Sharing</h2>
      <p>We do not sell your personal data...</p>
      
      <h2>4. Data Security</h2>
      <p>We implement security measures...</p>
      
      <h2>5. Your Rights</h2>
      <p>You can access, modify, or delete your data...</p>
      
      <h2>6. Contact</h2>
      <p>privacy@snapcart.com</p>
    </div>
  );
}