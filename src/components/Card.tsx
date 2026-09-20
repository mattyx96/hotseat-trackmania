import type { ReactNode } from 'react';
import { Paper, Text } from 'nebula-ds-react-library';

interface CardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  outline?: '700' | '500' | '200' | '50';
  children: ReactNode;
}

/** Nebula `Paper` with a consistent title/subtitle + actions header row. */
export function Card({ title, subtitle, actions, outline = '200', children }: CardProps) {
  return (
    <Paper round="no" outline={outline}>
      <div className="hs-cardhead">
        <div className="hs-titleblock">
          <Text component="h6" variant="header6">
            {title}
          </Text>
          {subtitle ? (
            <Text component="span" variant="body4" className="hs-muted">
              {subtitle}
            </Text>
          ) : null}
        </div>
        {actions ? <div className="hs-cardhead__actions">{actions}</div> : null}
      </div>
      {children}
    </Paper>
  );
}
