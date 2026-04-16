import { ProjectCard } from '../components/ProjectCard';
import type { Project } from '../types';

interface ProjectsSectionProps {
  projects: Project[];
}

/**
 * Projects section — renders a responsive auto-fill grid of ProjectCards.
 */
export function ProjectsSection({ projects }: ProjectsSectionProps) {
  if (projects.length === 0) return null;

  return (
    <section id="projects" className="section" aria-labelledby="projects-heading">
      <p className="section-label" id="projects-heading">Projects</p>
      <div className="projects-grid">
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </div>
    </section>
  );
}
