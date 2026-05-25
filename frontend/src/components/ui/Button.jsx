export default function Button({ className = "", variant = "primary", ...props }) {
  const styles = variant === "secondary" ? "border border-primary text-primary" : "bg-accent text-white";
  return <button className={`rounded-lg px-4 py-2 font-medium transition hover:opacity-90 ${styles} ${className}`} {...props} />;
}
