import { Badge } from '../components/Badge';

interface SkillsSectionProps {
  skills: string[];
}

/**
 * Skills section — renders skill badges in a flex-wrap grid.
 * Each badge has glassmorphism style with primary-color hover glow.
 */
export function SkillsSection({ skills }: SkillsSectionProps) {
  if (skills.length === 0) return null;

  return (
    <section id="skills" className="section" aria-labelledby="skills-heading">
      <p className="section-label" id="skills-heading">Skills</p>
      <div className="skills-grid" role="list" aria-label="Technical skills">
        {skills.map((skill) => (
          <div key={skill} role="listitem">
            <Badge label={skill} />
          </div>
        ))}
      </div>
    </section>
  );
}
