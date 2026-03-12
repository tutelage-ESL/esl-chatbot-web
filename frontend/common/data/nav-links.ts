import type { NavItem } from '~~/common/types/nav-links-type';
import type { SocialLink } from '~~/common/types/nav-links-type';

export const navItems: NavItem[] = [
    { link: '/#home' },
    { name: 'About Us', link: '/#aboutus' },
    { name: 'Loyalty Program', link: '/#loyaltyprogram' },
    { name: 'Community', link: '/#community' },
    { name: 'Our Partners', link: '/#ourpartners' },
    { name: 'Contact Us', link: '/#contact' },
    { name: 'FAQs', link: '/#faqs' },
    { link: '/#footer' },
];

export const socialLinks: SocialLink[] = [
    { name: 'Facebook', link: 'https://www.facebook.com/moonlinetravel', class: '' },
    { name: 'Instagram', link: 'https://www.instagram.com/moonline_travel/?hl=en', class: '' },
    { name: 'YouTube', link: 'https://www.youtube.com/@Moonlinetravelandtourism', class: '' },
    { name: 'LinkedIn', link: 'https://www.linkedin.com/company/moonline-travel-&-tourism-company', class: '' },
];