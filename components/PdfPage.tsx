import React from 'react';
import { StoryPage } from '../types';

interface Props {
  page: StoryPage;
  onImageLoad: () => void;
}

export const PdfPage: React.FC<Props> = ({ page, onImageLoad }) => {
  return (
    <div style={{
      width: '1024px',
      height: '1024px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      fontFamily: "'Crimson Pro', serif",
      color: 'rgb(30 41 59)',
    }}>
      <div style={{ width: '1024px', height: '684px', overflow: 'hidden' }}>
        <img
          src={page.imageUrl}
          alt={page.illustrationDescription}
          onLoad={onImageLoad}
          onError={onImageLoad} // Resolve even if image fails to load
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{
        flex: 1,
        padding: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        backgroundColor: '#FFFBEB' // Equivalent to amber-100
      }}>
        <p style={{
          fontSize: '32px',
          lineHeight: '1.6',
          textAlign: 'center',
          maxWidth: '80%',
        }}>
          {page.storyText}
        </p>
      </div>
    </div>
  );
};