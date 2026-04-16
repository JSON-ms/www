import { Avatar } from '../components/Avatar';
import type { ProfileData } from '../types';

interface HeroSectionProps {
  profile: ProfileData;
}

/**
 * Hero section — displays the avatar, name (with gradient text),
 * role, and a decorative divider. Always the first visible section.
 */
export function HeroSection({ profile }: HeroSectionProps) {
  const { name, role, avatar } = profile;

  return (
    <section id="hero" className="section hero" aria-labelledby="hero-name">
      <div className="hero-top">
        <div className="hero-text">
          <p className="hero-greeting">Hello, I&apos;m</p>
          <h1 id="hero-name" className="hero-name">
            {name || 'Your Name'}
          </h1>
          <p className="hero-role">{role || 'Your Role'}</p>
          <div className="hero-divider" aria-hidden="true" />
        </div>

        {avatar && (
          <Avatar src={avatar} alt={name || 'Profile picture'} size={110} />
        )}
      </div>
    </section>
  );
}
