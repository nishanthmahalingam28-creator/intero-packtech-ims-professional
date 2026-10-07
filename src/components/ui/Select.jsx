// options: [{ value, label }]
export default function Select({ value, onChange, options, className = '', ...rest }) {
  return (
    <select className={`input ${className}`} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
