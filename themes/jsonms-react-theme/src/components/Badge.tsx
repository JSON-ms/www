interface BadgeProps {
  label: string;
}

/**
 * Skill badge pill — glassmorphism style with primary color hover glow.
 */
export function Badge({ label }: BadgeProps) {
  return <span className="badge">{label}</span>;
}
