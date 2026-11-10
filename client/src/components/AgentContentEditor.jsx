import { useEffect, useRef, useState } from 'react';
import ThemePicker from './ThemePicker.jsx';
import { defaultContent, fields, imageUrl, loadContent, prepareImage, saveContent, SITE_ID } from '../services/siteContent.js';

const sections = {
  about: ['name', 'professionalTitle', 'headline', 'bio', 'aboutTitle', 'aboutIntro', 'aboutStory'],
  contact: ['brokerage', 'email', 'phone', 'location', 'address', 'website', 'facebook', 'instagram', 'linkedin'],
};
const multiline = ['bio', 'aboutIntro', 'aboutStory', 'address'];

function ImageField({ kind, value, file, onChange, onRemove, disabled, onError, onProcessing }) {
  const [preview, setPreview] = useState('');
  const [processing, setProcessing] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => { URL.revokeObjectURL(url); setPreview(''); };
  }, [file]);
  const src = file ? preview : imageUrl(value);
  async function choose(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setProcessing(true); onProcessing(true);
    try { onChange(await prepareImage(selected)); }
    catch (error) { onError(error.message); }
    finally { setProcessing(false); onProcessing(false); if (input.current) input.current.value = ''; }
  }
  return <div className="editor-image-field">
    <div className={`editor-image-preview ${kind}`}>
      {src ? <img src={src} alt={kind === 'photo' ? 'Agent photo preview' : 'Company logo preview'} /> : <span>{kind === 'photo' ? 'Your photo' : 'Company logo'}</span>}
    </div>
    <div><h3>{kind === 'photo' ? 'Agent photo' : 'Company logo'}</h3><p>JPG, PNG, or WebP · up to 5 MB. Images are optimized before uploading.</p>
      <label className="admin-secondary upload-label">{processing ? 'Optimizing…' : 'Choose image'}<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={disabled || processing} /></label>
      {(src || file) && <button type="button" className="editor-remove" onClick={onRemove} disabled={disabled || processing}>Remove</button>}
      <small>Image changes publish when you save.</small>
    </div>
  </div>;
}

export default function AgentContentEditor({ agent, onDirtyChange }) {
  const [section, setSection] = useState('about');
  const [form, setForm] = useState(defaultContent);
  const [baseline, setBaseline] = useState(defaultContent);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [published, setPublished] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty = !loading && !loadFailed && (!published || JSON.stringify(form) !== JSON.stringify(baseline) || Object.values(files).some(Boolean));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadFailed(false); setError('');
    loadContent(agent.siteId).then(({ content, exists }) => {
      if (active) {
        const initial = exists ? content : { ...content, name: agent.name };
        setForm(initial); setBaseline(initial); setFiles({}); setPublished(exists);
      }
    }).catch(error => { if (active) { setError(error.message); setLoadFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [agent.siteId, agent.name, retry]);
  useEffect(() => {
    function protect(event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } }
    function protectLink(event) {
      const link = event.target.closest?.('a[href^="#/"]');
      if (dirty && link && link.target !== '_blank' && link.getAttribute('href') !== '#/admin' && !window.confirm('Leave this page and discard your unsaved changes?')) event.preventDefault();
    }
    window.addEventListener('beforeunload', protect);
    document.addEventListener('click', protectLink, true);
    return () => { window.removeEventListener('beforeunload', protect); document.removeEventListener('click', protectLink, true); };
  }, [dirty]);
  function update(key, value) { setForm(current => ({ ...current, [key]: value })); setMessage(''); setError(''); }
  async function publish(event) {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try {
      const result = await saveContent(agent.siteId, form, files, baseline);
      setForm(result.content); setBaseline(result.content); setFiles({}); setPublished(true);
      setMessage(result.cleanupWarning ? 'Published successfully. An old image could not be removed; contact your administrator to clean it up.' : 'Published successfully. Your website now shows the saved details.');
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  }
  function discard() {
    if (!dirty || window.confirm('Discard your unsaved changes?')) { setForm(baseline); setFiles({}); setError(''); setMessage(''); }
  }
  if (loading) return <div className="admin-account" role="status">Loading your website content…</div>;
  if (loadFailed) return <div className="admin-account"><p role="alert" className="admin-error">{error}</p><button className="admin-secondary" onClick={() => setRetry(value => value + 1)}>Try loading again</button></div>;
  return <section className="content-editor" aria-label="Website content editor">
    <div className="editor-heading"><div><span className="admin-label">WEBSITE CONTENT</span><h2>Make it yours.</h2><p>Edit your details, then publish them to your website.</p></div><span className={`editor-state ${dirty ? 'has-changes' : ''}`}>{!published ? 'Not published yet' : dirty ? 'Unsaved changes' : 'All changes saved'}</span></div>
    {agent.siteId !== SITE_ID && <p className="admin-error">This deployment displays {SITE_ID}. You are editing {agent.siteId}; use that site’s deployment to view your published changes.</p>}
    <div className="editor-tabs" role="tablist" aria-label="Content sections">{Object.keys(sections).map(key => <button key={key} id={`tab-${key}`} role="tab" aria-selected={section === key} aria-controls="editor-panel" type="button" disabled={processingImage || saving} onClick={() => setSection(key)}>{key === 'about' ? 'About Me' : 'Contact & branding'}</button>)}</div>
    <form onSubmit={publish}>
      <fieldset disabled={saving}>
        <ThemePicker value={form.themeKey || 'forest'} onChange={themeKey => update('themeKey', themeKey)} />
        <div id="editor-panel" role="tabpanel" aria-labelledby={`tab-${section}`}>
          <ImageField kind={section === 'about' ? 'photo' : 'logo'} value={form[section === 'about' ? 'photoPath' : 'logoPath']} file={files[section === 'about' ? 'photo' : 'logo']} disabled={saving}
            onChange={file => { const kind = section === 'about' ? 'photo' : 'logo'; setFiles(current => ({ ...current, [kind]: file })); setMessage(''); setError(''); }}
            onRemove={() => { const kind = section === 'about' ? 'photo' : 'logo'; setFiles(current => ({ ...current, [kind]: null })); update(`${kind}Path`, ''); }} onError={setError} onProcessing={setProcessingImage} />
          <div className="editor-fields">{sections[section].map(key => <label key={key} className={multiline.includes(key) ? 'editor-wide' : ''} htmlFor={`content-${key}`}>
            <span>{fields[key][0]}{['name', 'bio', 'email', 'phone', 'location'].includes(key) ? ' *' : ''}</span>
            {multiline.includes(key) ? <textarea id={`content-${key}`} rows={key === 'aboutStory' ? 7 : 4} maxLength={fields[key][1]} value={form[key]} onChange={event => update(key, event.target.value)} /> :
              <input id={`content-${key}`} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : ['website', 'facebook', 'instagram', 'linkedin'].includes(key) ? 'url' : 'text'} maxLength={fields[key][1]} value={form[key]} onChange={event => update(key, event.target.value)} placeholder={['website', 'facebook', 'instagram', 'linkedin'].includes(key) ? 'https://…' : undefined} />}
            {multiline.includes(key) && <small>{form[key].length.toLocaleString()} / {fields[key][1].toLocaleString()}</small>}
          </label>)}</div>
        </div>
      </fieldset>
      <p className="editor-publish-note">Save & Publish saves both sections and makes your changes public immediately. Your contact email is public and does not change your login email.</p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="editor-success" role="status">{message}</p>}
      <div className="editor-actions"><button className="admin-primary" type="submit" disabled={saving || processingImage || !dirty}>{saving ? 'Publishing…' : 'Save & Publish'}</button><button className="admin-secondary" type="button" onClick={discard} disabled={saving || processingImage || !dirty}>Discard changes</button><a href={section === 'about' ? '#/about' : '#/contact'} target="_blank" rel="noopener noreferrer">View live page ↗</a></div>
    </form>
  </section>;
}
