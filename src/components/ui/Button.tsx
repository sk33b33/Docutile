import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-cyan-700 to-violet-700 text-white shadow-[0_0_18px_rgba(34,211,238,0.4)] hover:from-cyan-600 hover:to-violet-600 hover:shadow-[0_0_30px_rgba(139,92,246,0.65)]",
  secondary: "glass border border-white/20 text-slate-100 hover:border-cyan-300/60 hover:bg-white/10 hover:shadow-[0_0_18px_rgba(34,211,238,0.3)]",
  danger: "bg-red-700 text-white shadow-[0_0_16px_rgba(248,113,113,0.35)] hover:bg-red-600 hover:shadow-[0_0_26px_rgba(248,113,113,0.6)]",
  ghost: "text-slate-200 hover:bg-white/10",
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
