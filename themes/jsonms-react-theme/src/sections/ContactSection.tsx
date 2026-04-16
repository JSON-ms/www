import { SocialLink } from '../components/SocialLink';
import type { ContactLink } from '../types';

interface ContactSectionProps {
  links: ContactLink[];
}

/**
 * Contact section — renders a row of social / contact links.
 */
export function ContactSection({ links }: ContactSectionProps) {
  if (links.length === 0) return null;

  return (
    <section id="contact" className="section" aria-labelledby="contact-heading">
      <p className="section-label" id="contact-heading">Contact</p>
      <nav className="contact-links" aria-label="Social and contact links">
        {links.map((link) => (
          <SocialLink key={link.href} {...link} />
        ))}
      </nav>
    </section>
  );
}
