export default function Badge({ children, className = "", variant="solid" }) {
  const base = "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition";
  const styles = { solid: "bg-purple-600 text-white border-purple-700", outline: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50" };
  return <span className={[base, styles[variant] || styles.solid, className].join(' ')}>{children}</span>;
}
