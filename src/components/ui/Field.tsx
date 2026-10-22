import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 aria-[invalid=true]:border-red-600";

interface FieldProps { label: string; htmlFor: string; error?: string; hint?: string; required?: boolean; children: ReactNode }

export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-700"> *<span className="sr-only"> (required)</span></span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-slate-600">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
