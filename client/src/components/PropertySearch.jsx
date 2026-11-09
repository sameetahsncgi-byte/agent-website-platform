import '../styles/ListingStatus.css';

export default function PropertySearch({
  search, setSearch, budget, setBudget, status, onSubmit,
  statusOptions = [], selectedStatus = status, setSelectedStatus,
}) {
  const showStatus = statusOptions.length > 1;
  return <form className={`search-panel container${showStatus ? ' has-status-filter' : ''}`} onSubmit={onSubmit}>
    <label>Location<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search city or street address" /></label>
    {showStatus && <label>Listing status
      <select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)}>
        <option value="All">All statuses</option>
        {statusOptions.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>}
    <label>{status === 'Sold' ? 'Sold price' : 'Your budget'}<select value={budget} onChange={event => setBudget(event.target.value)}>
      <option value="all">Any price</option><option value="500000">Up to $500,000</option>
      <option value="750000">Up to $750,000</option><option value="1000000">Up to $1,000,000</option>
    </select></label>
    <button className="button" type="submit">Search properties ↗</button>
  </form>;
}
