import type { Project } from '../types';

type ProjectCardProps = Project;

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
  </svg>
);

/**
 * Glassmorphism project card with hover lift effect and an accent top-border.
 */
export function ProjectCard({ title, description, tags, url, stars }: ProjectCardProps) {
  return (
    <article className="project-card">
      <div className="project-card__header">
        <h3 className="project-card__title">{title}</h3>
        {typeof stars === 'number' && (
          <span className="project-card__stars" aria-label={`${stars} stars`}>
            <StarIcon />
            {stars.toLocaleString()}
          </span>
        )}
      </div>

      <p className="project-card__description">{description}</p>

      {tags.length > 0 && (
        <div className="project-card__tags" aria-label="Technologies">
          {tags.map((tag) => (
            <span key={tag} className="project-card__tag">{tag}</span>
          ))}
        </div>
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="project-card__link"
          aria-label={`View ${title} on GitHub`}
        >
          View project <ArrowIcon />
        </a>
      )}
    </article>
  );
}
