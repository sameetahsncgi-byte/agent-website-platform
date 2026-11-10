import Icon from './Icon.jsx';
import '../styles/ListingStatus.css';
export default function PropertySearch({ search, setSearch, budget, setBudget, status, onSubmit, statusOptions = [], selectedStatus = status, setSelectedStatus }) {
  const showStatus = statusOptions.length > 1;
  return <form className={`search-panel container${showStatus ? ' has-status-filter' : ''}`} onSubmit={onSubmit} aria-label="Property search">
    <label><span><Icon name="pin" size={14}/> Location</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="City or street address"/></label>
    {showStatus && <label><span>Listing status</span><select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)}><option value="All">All statuses</option>{statusOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label>}
    <label><span>{status === 'Sold' ? 'Sold price' : 'Price range'}</span><select value={budget} onChange={event => setBudget(event.target.value)}><option value="all">Any price</option><option value="500000">Up to $500,000</option><option value="750000">Up to $750,000</option><option value="1000000">Up to $1,000,000</option></select></label>
    <button className="button" type="submit"><Icon name="search" size={17}/> Find a home <Icon name="arrow" size={18}/></button>
  </form>;
}
