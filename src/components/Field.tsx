import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="pl-2 text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="pl-2 text-sm font-semibold text-wii-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-2 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = { name: string; label: string; error?: string; hint?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "id"
>;

export function TextField({ name, label, error, hint, ...input }: TextFieldProps) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        name={name}
        className="wii-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...input}
      />
    </FieldShell>
  );
}

type SelectFieldProps = {
  name: string;
  label: string;
  error?: string;
  options: readonly { id: string; label: string }[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id">;

export function SelectField({ name, label, error, options, ...select }: SelectFieldProps) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        name={name}
        className="wii-input cursor-pointer"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...select}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
