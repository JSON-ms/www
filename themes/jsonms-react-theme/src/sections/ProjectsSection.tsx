import React from 'react';
import { Section } from '../components/Section';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Profile } from '../types';

interface ProjectsSectionProps {
  profile: Profile;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ profile }) => {
  if (!profile.projects || profile.projects.length === 0) return null;

  return (
    <Section id="projects" title="Projects">
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {profile.projects.map((project, index) => (
          <Card key={index}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                {project.title}
              </h3>
              <p 
                style={{
                  color: 'var(--color-text-muted)',
                  flexGrow: 1,
                  marginBottom: '1rem',
                  lineHeight: 1.6,
                }}
              >
                {project.description}
              </p>
              
              {project.tags && project.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {project.tags.map((tag, i) => (
                    <Badge key={i}>{tag}</Badge>
                  ))}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                {project.url && (
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--color-text)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                      fontWeight: 500,
                    }}
                  >
                    View Project
                  </a>
                )}
                {project.repository && (
                  <a 
                    href={project.repository} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--color-text-muted)',
                      textDecoration: 'none',
                    }}
                  >
                    Source Code
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
};
