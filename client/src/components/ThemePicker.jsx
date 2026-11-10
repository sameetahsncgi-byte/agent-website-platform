import { useId } from 'react';
import { THEMES, getTheme, themeVariables } from '../data/themes.js';

export default function ThemePicker({ value = 'forest', onChange }) {
  const id = useId();
  const selected = getTheme(value);
  return <section className="theme-picker">
    <div className="theme-picker-heading"><div><h3 id={id}>Website color theme</h3><p>Choose your palette. Your changes go live with Save &amp; Publish.</p></div><span className="theme-current">{selected.name}</span></div>
    <div className="theme-options" role="group" aria-labelledby={id}>
      {THEMES.map(theme => <label key={theme.id} className={`theme-choice ${selected.id === theme.id ? 'is-selected' : ''}`}>
        <input type="radio" name={`website-theme-${id}`} value={theme.id} checked={selected.id === theme.id} onChange={() => onChange(theme.id)} />
        <span className="theme-swatches" aria-hidden="true"><span style={{ backgroundColor: theme.primary }}/><span style={{ backgroundColor: theme.dark }}/><span style={{ backgroundColor: theme.surface }}/></span>
        <span className="theme-name">{theme.name}</span>
      </label>)}
    </div>
    <div className="theme-mini-preview" style={themeVariables(selected.id)} aria-label={`${selected.name} color preview`}>
      <div><span className="theme-preview-label">YOUR WEBSITE PALETTE</span><strong>Your next chapter starts here.</strong></div><span className="theme-preview-button">Explore homes <span aria-hidden="true">↗</span></span>
    </div>
    <small className="theme-help">Preview only until published. Changes apply to website colors; your photos and logo keep their original colors.</small>
  </section>;
}
