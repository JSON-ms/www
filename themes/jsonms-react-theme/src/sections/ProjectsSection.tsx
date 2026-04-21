import React from 'react';
import { ExternalLink, GitBranch } from 'lucide-react';
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
    <Section id="projects" title="Featured Work">
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {profile.projects.map((project, index) => (
          <Card key={index} index={index}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {project.title}
              </h3>
              <p 
                style={{
                  color: 'var(--color-text-muted)',
                  flexGrow: 1,
                  marginBottom: '1.5rem',
                  lineHeight: 1.6,
                  fontSize: '1.05rem',
                }}
              >
                {project.description}
              </p>
              
              {project.tags && project.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {project.tags.map((tag, i) => (
                    <Badge key={i} index={i}>{tag}</Badge>
                  ))}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: 'auto', alignItems: 'center' }}>
                {project.url && (
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--color-text)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                  >
                    <ExternalLink size={18} />
                    Live Demo
                  </a>
                )}
                {project.repository && (
                  <a 
                    href={project.repository} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                  >
                    <GitBranch size={18} />
                    Source
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
