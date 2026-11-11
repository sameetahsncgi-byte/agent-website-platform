// No credentials or website data are written to browser storage.
const eventName='agent-website-settings-changed';
export function notifyWebsiteSettingsChanged() {
  window.dispatchEvent(new Event(eventName));
  try { window.localStorage.setItem(eventName, `${Date.now()}-${Math.random()}`); } catch { /* Polling still synchronizes other dashboards. */ }
}
export function watchWebsiteSettings(refresh) {
  const focused=()=>refresh();
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  const stored=event=>{if(event.key===eventName)refresh();};
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh();},10000);
  document.addEventListener?.('visibilitychange',visible);
  window.addEventListener('focus',focused);
  window.addEventListener(eventName,focused);
  window.addEventListener('storage',stored);
  return ()=>{document.removeEventListener?.('visibilitychange',visible);window.clearInterval(timer);window.removeEventListener('focus',focused);window.removeEventListener(eventName,focused);window.removeEventListener('storage',stored);};
}
