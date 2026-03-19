'use client';

import s from './ui.module.css';

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  alt?: string;
  className?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function UserAvatar({ name, src, size = 36, alt, className = '' }: UserAvatarProps) {
  const imageUrl = src ? (src.startsWith('/') ? src : `/${src}`) : null;
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={alt ?? `${name || 'Usuário'} avatar`}
      className={`${s.userAvatarImage} ${className}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div className={`${s.userAvatarFallback} ${className}`} style={{ width: size, height: size }}>
      {getInitials(name || 'U')}
    </div>
  );
}
