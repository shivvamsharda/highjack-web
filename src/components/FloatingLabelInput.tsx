
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

interface FloatingLabelInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  transform?: (value: string) => string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  transform
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = transform ? transform(e.target.value) : e.target.value;
    onChange(newValue);
  };

  return (
    <div className="forge-input-row">
      <label
        htmlFor={id}
        className={`forge-input-label ${isFocused ? 'text-[#ffd7e4]' : ''} ${disabled ? 'opacity-50' : ''}`}
      >
        {label}
      </label>
      <span className="forge-colon">:</span>
      <div className="relative flex-1">
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="forge-input h-10 md:h-11 pr-16 placeholder:text-[#9f7988]"
        />
        {maxLength && (
          <div className="forge-counter">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingLabelInput;
