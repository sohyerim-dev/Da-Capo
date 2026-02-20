import "./Input.scss";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <div className="input-field">
      {label && (
        <label className="input-field__label">
          {label}
          {props.required && <span className="input-field__required"> *</span>}
        </label>
      )}
      <input
        className={`input-field__input${error ? " input-field__input--error" : ""}`}
        {...props}
      />
      {error && <p className="input-field__error">{error}</p>}
    </div>
  );
}
