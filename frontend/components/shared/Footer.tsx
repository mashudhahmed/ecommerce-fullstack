// components/shared/Footer.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdAccessTime,
  MdShoppingBag,
  MdFavorite,
  MdVerified,
  MdLocalShipping,
  MdCreditCard,
  MdKeyboardArrowUp
} from 'react-icons/md';
import { 
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaGithub,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaPaypal
} from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Footer() {
  // ============================================================
  // ✅ HOOKS – MUST BE CALLED FIRST
  // ============================================================
  const { user } = useAuth();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ============================================================
  // ✅ EFFECTS
  // ============================================================
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ============================================================
  // ✅ DETERMINE FOOTER VISIBILITY
  // ============================================================

  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/superadmin');
  const isVendorRoute = pathname?.startsWith('/vendor');
  const isAuthPage = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'].some(
    (p) => pathname?.startsWith(p)
  );
  const isAdminUser = user?.role === 'admin' || user?.role === 'superadmin';
  const isVendorUser = user?.role === 'vendor';

  if (isAdminRoute || isAdminUser || isAuthPage) {
    return null;
  }

  const isVendor = isVendorRoute || isVendorUser;

  // ============================================================
  // NEWSLETTER SUBSCRIPTION
  // ============================================================

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubscribing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Subscribed successfully!');
      setEmail('');
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================
  // SOCIAL ICONS
  // ============================================================

  const socialIcons = [
    { icon: FaFacebook, label: 'Facebook', href: '#' },
    { icon: FaTwitter, label: 'Twitter', href: '#' },
    { icon: FaInstagram, label: 'Instagram', href: '#' },
    { icon: FaYoutube, label: 'YouTube', href: '#' },
    { icon: FaGithub, label: 'GitHub', href: '#' },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <footer className={cn(
      "bg-muted/30 border-t mt-auto",
      isVendor && "bg-muted/10 border-t-0"
    )}>
      {/* Back to Top */}
      {showScrollTop && (
        <div className="container mx-auto px-4">
          <div className="flex justify-center -mt-6">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md hover:shadow-lg transition-all"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <MdKeyboardArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        {isVendor ? (
          // ============================================================
          // VENDOR SIMPLIFIED FOOTER
          // ============================================================
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="relative h-6 w-6">
                <Image
                  src="/logo.png"
                  alt="SnapCart"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">SnapCart</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SnapCart. All rights reserved.
            </p>
            <div className="flex justify-center gap-4 mt-3 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            </div>
          </div>
        ) : (
          // ============================================================
          // CUSTOMER FULL FOOTER
          // ============================================================
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Brand Section */}
              <div className="space-y-4">
                <Link href="/" className="flex items-center gap-2.5 group">
                  <div className="relative h-8 w-8 shrink-0">
                    <Image
                      src="/logo.png"
                      alt="SnapCart"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors duration-200">
                    SnapCart
                  </span>
                </Link>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Your one-stop shop for quality products. We deliver excellence with every order.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MdLocalShipping className="h-4 w-4" />
                    <span>Free shipping</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MdVerified className="h-4 w-4" />
                    <span>Secure payment</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  {socialIcons.map((social) => (
                    <Button
                      key={social.label}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-primary/10"
                      asChild
                    >
                      <Link href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                        <social.icon className="h-4 w-4" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  {['Products', 'Categories', 'New Arrivals', 'Sale', 'Blog'].map((item) => (
                    <li key={item}>
                      <Link 
                        href={`/${item.toLowerCase().replace(/\s+/g, '-')}`} 
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm">
                  {['Help Center', 'FAQ', 'Returns Policy', 'Shipping Info', 'Contact Us'].map((item) => (
                    <li key={item}>
                      <Link 
                        href={`/${item.toLowerCase().replace(/\s+/g, '-')}`} 
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter & Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold">Stay Updated</h3>
                <p className="text-sm text-muted-foreground">
                  Subscribe for exclusive offers and updates.
                </p>
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" disabled={isSubscribing} className="shrink-0">
                    {isSubscribing ? '...' : 'Subscribe'}
                  </Button>
                </form>

                <div className="space-y-2 pt-2 text-sm">
                  {[
                    { icon: MdEmail, text: 'support@snapcart.com' },
                    { icon: MdPhone, text: '+1 (555) 123-4567' },
                    { icon: MdLocationOn, text: '123 Main St, New York, NY 10001' },
                    { icon: MdAccessTime, text: 'Mon-Fri: 9AM - 6PM EST' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-muted-foreground">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Methods & Legal */}
            <Separator className="my-8" />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} SnapCart. All rights reserved. Team SnapCart
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MdCreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Payment Methods</span>
                <div className="flex items-center gap-1">
                  <FaCcVisa className="h-5 w-5 text-blue-600" />
                  <FaCcMastercard className="h-5 w-5 text-orange-500" />
                  <FaCcAmex className="h-5 w-5 text-blue-400" />
                  <FaPaypal className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                {['Privacy', 'Terms', 'Cookies'].map((item) => (
                  <Link 
                    key={item} 
                    href={`/${item.toLowerCase()}`} 
                    className="hover:text-foreground transition-colors"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}