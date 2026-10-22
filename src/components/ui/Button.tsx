import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-blue-700 text-white hover:bg-blue-800",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
  ghost: "text-slate-700 hover:bg-slate-100",
};
const sizes: Record<Size, string> = { sm: "h-8 px-2.5 text-sm", md: "h-10 px-4 text-sm" };

export const buttonClass = (variant: Variant = "secondary", size: Size = "md") =>
  `${base} ${variants[variant]} ${sizes[size]}`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size }

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", className = "", type = "button", ...rest }, ref,
) {
  return <button ref={ref} type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest} />;
});

export function LinkButton({ variant = "secondary", size = "md", className = "", ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={`${buttonClass(variant, size)} ${className}`} {...rest} />;
}
