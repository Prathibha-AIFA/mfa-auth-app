// src/components/TextInput.tsx
import React from "react";

type NativeInputProps = React.InputHTMLAttributes<HTMLInputElement>;

interface TextInputProps
  extends Omit<NativeInputProps, "onChange" | "value"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  ...rest
}) => {
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && (
        <label style={{ display: "block", marginBottom: "4px" }}>{label}</label>
      )}
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      />
    </div>
  );
};

export default TextInput;
