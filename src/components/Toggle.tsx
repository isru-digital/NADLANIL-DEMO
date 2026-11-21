import '../styles/post-form.css'

/**
 * A small on / off switch with its words (Itzik 22.11.2026): "להציג מספר בניין", "להעלות גם כסטורי", "לפרסם גם כפוסט
 * בפיד". The whole row is the button, a full finger high, and it says what it is to a screen reader (role="switch").
 * Off is the calm grey; on is the green of everything that can be pressed.
 */
export function Toggle({ id, on, onChange, label, hint, warn }: { id: string; on: boolean; onChange: (next: boolean) => void; label: string; hint?: string; warn?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="pf-toggle" onClick={() => onChange(!on)} data-toggle={id}>
      <span className="pf-toggle-text">
        <b>{label}</b>
        {warn ? (
          <small className="is-warn" role="alert" data-warn={id}>
            {warn}
          </small>
        ) : (
          hint && <small>{hint}</small>
        )}
      </span>
      <span className="pf-track" aria-hidden>
        <i />
      </span>
    </button>
  )
}
