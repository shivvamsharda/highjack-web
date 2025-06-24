
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
  const hasValue = value.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = transform ? transform(e.target.value) : e.target.value;
    onChange(newValue);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="h-14 pt-6 pb-2 px-4 bg-input/50 border-border focus:border-primary focus:ring-primary transition-all duration-300 placeholder:text-transparent"
      />
      <label
        htmlFor={id}
        className={`floating-label ${isFocused || hasValue ? 'active' : ''}`}
      >
        {label}
      </label>
      {maxLength && (
        <div className="absolute right-3 bottom-2 text-xs text-muted-foreground">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default FloatingLabelInput;
