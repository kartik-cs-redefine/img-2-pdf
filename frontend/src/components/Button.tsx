import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
} & (AnchorHTMLAttributes<HTMLAnchorElement> | ButtonHTMLAttributes<HTMLButtonElement>);

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const classes = `button button--${variant} ${className}`.trim();

  if ('href' in props) {
    return <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>{children}</a>;
  }

  return <button className={classes} type="button" {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
}
