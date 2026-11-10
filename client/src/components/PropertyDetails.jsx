import { useEffect, useRef } from 'react';
import { money } from '../utils/format.js';
import { useAgent } from '../context/AgentContext.js';

export default function PropertyDetails({ property, onClose }) {
  const agent = useAgent();
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (property && !dialog.open) dialog.showModal();
    if (!property && dialog.open) dialog.close();
  }, [property]);

  return <dialog ref={dialogRef} className="property-dialog" aria-labelledby="property-dialog-title" onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) dialogRef.current.close(); }}>
    {property && <>
      <div className="dialog-image"><img src={property.image} alt={`Sample photo for ${property.title}`} />
        <button className="dialog-close" type="button" aria-label="Close property details" onClick={() => dialogRef.current.close()}>×</button></div>
      <div className="dialog-content"><span className="eyebrow">DEMO PROPERTY · {property.status.toUpperCase()}</span>
        <h2>{money(property.price)}</h2><h3 id="property-dialog-title">{property.title}</h3><p className="property-city">{property.city}</p>
        <div className="property-features"><span>{property.beds} beds</span><span>{property.baths} baths</span><span>{property.sqft.toLocaleString()} sqft</span></div>
        {property.soldDate && <p>Demo closing date: {property.soldDate}</p>}<p>{property.description}</p>
        <a className="button" href={`mailto:${agent.email}?subject=${encodeURIComponent(`Demo inquiry: ${property.title}`)}`}>Ask {agent.name.split(' ')[0]} about this home ↗</a>
        <p className="demo-note">Fictional details and sample photo. Email opens your email application. Not an offer for sale.</p>
      </div>
    </>}
  </dialog>;
}
