interface AboutSectionProps {
  bio: string;
}

/**
 * About section — displays the user's bio with a styled left border accent.
 */
export function AboutSection({ bio }: AboutSectionProps) {
  return (
    <section id="about" className="section" aria-labelledby="about-heading">
      <p className="section-label" id="about-heading">About</p>
      <p className="about-text">{bio}</p>
    </section>
  );
}
