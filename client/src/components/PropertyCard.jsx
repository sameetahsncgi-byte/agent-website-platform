import { money } from '../utils/format.js';

export default function PropertyCard({ property, isSaved, onSave, onView }) {
  return <article className="property-card">
    <div className="property-image">
      <img src={property.image} alt={`Sample photo for ${property.title}`} loading="lazy" />
      <span className={`property-badge ${property.status === 'Sold' ? 'sold-badge' : ''}`}>{property.badge}</span>
      <button className="save-button" type="button" onClick={() => onSave(property.id)}
        aria-pressed={isSaved} aria-label={`${isSaved ? 'Unsave' : 'Save'} ${property.title}`}>{isSaved ? '♥' : '♡'}</button>
    </div>
    <div className="property-content">
      {property.status === 'Sold' && <span className="price-caption">DEMO SOLD PRICE</span>}
      <p className="property-price">{money(property.price)}</p><h3>{property.title}</h3>
      <p className="property-city">{property.city}</p>
      <div className="property-features"><span>{property.beds} beds</span><span>{property.baths} baths</span><span>{property.sqft.toLocaleString()} sqft</span></div>
      {property.soldDate && <p className="sold-date">Demo closing: {property.soldDate}</p>}
      <button className="property-link" type="button" onClick={() => onView(property)}>View property <span>↗</span></button>
    </div>
  </article>;
}
