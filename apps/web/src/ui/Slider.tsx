import React from 'react';

type SliderProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Slider({ className = '', ...rest }: SliderProps) {
  return (
    <input type="range" className={`slider ${className}`} {...rest} />
  );
}

