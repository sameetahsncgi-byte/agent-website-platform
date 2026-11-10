import { useId, useRef, useState } from 'react';
import PropertySearch from './PropertySearch.jsx';
import PropertyCard from './PropertyCard.jsx';
import { properties } from '../data/properties.js';
import { filterProperties } from '../utils/format.js';
import '../styles/Listings.css';

export default function ListingsCollection({
  status = 'Active', saved = [], onSave, onView,
  items = properties, statusOptions = [status],
  sourceDescription = 'Fictional demo listings with sample property photos.',
}) {
  const [search, setSearch] = useState('');
  const [budget, setBudget] = useState('all');
  const multipleStatuses = statusOptions.length > 1;
  const [statusChoice, setStatusChoice] = useState('All');
  const selectedStatus = multipleStatuses ? statusChoice : status;
  const sectionRef = useRef(null);
  const headingId = useId();
  // All includes only the statuses allowed for this page, never Sold records.
  const eligible = items.filter(property => statusOptions.includes(property.status));
  const visible = filterProperties(eligible, selectedStatus, search, budget);
  const savedInCollection = visible.filter(property => saved.includes(property.id)).length;

  function clearFilters() {
    setSearch('');
    setBudget('all');
    setStatusChoice('All');
  }

  return <>
    <PropertySearch search={search} setSearch={setSearch} budget={budget} setBudget={setBudget}
      status={status} statusOptions={statusOptions} selectedStatus={selectedStatus} setSelectedStatus={setStatusChoice}
      onSubmit={event => { event.preventDefault(); sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
    <section ref={sectionRef} className="properties-section container" aria-labelledby={headingId}>
      <div className="section-heading"><div>
        <span className="eyebrow">{status === 'Sold' ? 'COMPLETED CHAPTERS' : 'A PLACE TO CALL YOUR OWN'}</span>
        <h2 id={headingId}>{status === 'Sold' ? 'A look at past sales.' : multipleStatuses ? 'Explore active and pending homes.' : 'Some places just feel like home.'}</h2>
        <p>{sourceDescription}</p>
      </div><span className="results-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'property' : 'properties'} · {savedInCollection} saved</span></div>
      <div className="properties-grid">{visible.map(property => <PropertyCard key={property.id} property={property} isSaved={saved.includes(property.id)} onSave={onSave} onView={onView} />)}</div>
      {!visible.length && <div className="empty-state"><h3>No matching demo properties.</h3><p>Try a different location, status, or price range.</p>
        <button className="button" type="button" onClick={clearFilters}>Clear filters</button></div>}
    </section>
  </>;
}
