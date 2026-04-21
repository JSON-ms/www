import React from 'react';
import { Section } from '../components/Section';
import { Badge } from '../components/Badge';
import { Profile } from '../types';

interface SkillsSectionProps {
  profile: Profile;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ profile }) => {
  if (!profile.skills || profile.skills.length === 0) return null;

  return (
    <Section id="skills" title="Skills">
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {profile.skills.map((skill, index) => (
          <Badge key={index}>
            {skill.name}
          </Badge>
        ))}
      </div>
    </Section>
  );
};
