import React from 'react';

export default function GlobalLoader({ size = 'medium', className = '' }) {
    const sizeClasses = {
        small: 'w-[62px] h-[12px]',
        medium: 'w-[124px] h-[24px]',
        large: 'w-[186px] h-[36px]'
    };

    return (
        <div className={`global-loader ${sizeClasses[size]} ${className}`}></div>
    );
}

