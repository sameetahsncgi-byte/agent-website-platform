import { money } from '../utils/format.js';
import Icon from './Icon.jsx';
export default function PropertyCard({ property, isSaved, onSave, onView }) {
  return <article className="property-card">
    <div className="property-image"><button type="button" className="property-photo-link" onClick={() => onView(property)} aria-label={`View ${property.title}`}><img src={property.image} alt={`Sample photo for ${property.title}`} loading="lazy"/></button>
      <span className={`property-badge ${property.status === 'Sold' ? 'sold-badge' : ''}`}>{property.badge}</span>
      <button className="save-button" type="button" onClick={() => onSave(property.id)} aria-pressed={isSaved} aria-label={`${isSaved ? 'Unsave' : 'Save'} ${property.title}`}><Icon name="heart" size={18} fill={isSaved ? 'currentColor' : 'none'}/></button>
    </div>
    <div className="property-content">{property.status === 'Sold' && <span className="price-caption">SAMPLE SOLD PRICE</span>}<p className="property-price">{money(property.price)}</p><h3>{property.title}</h3><p className="property-city"><Icon name="pin" size={13}/>{property.city}</p>
      <div className="property-features"><span><Icon name="bed" size={16}/>{property.beds} beds</span><span><Icon name="bath" size={16}/>{property.baths} baths</span><span><Icon name="area" size={14}/>{property.sqft.toLocaleString()} sqft</span></div>
      {property.soldDate && <p className="sold-date">Sample closing: {property.soldDate}</p>}
      <button className="property-link" type="button" onClick={() => onView(property)}>Discover this home <Icon name="diagonal" size={17}/></button>
    </div>
  </article>;
}
