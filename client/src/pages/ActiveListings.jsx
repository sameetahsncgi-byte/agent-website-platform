import PageIntro from '../components/PageIntro.jsx';
import ListingsCollection from '../components/ListingsCollection.jsx';
import ContactCallout from '../components/ContactCallout.jsx';
import useListings from '../hooks/useListings.js';

const listingStatuses = ['Active', 'Pending'];

export default function ActiveListings(listingActions) {
  const { listings, loading, error, retry } = useListings();
  return <>
    <PageIntro eyebrow="EXPLORE THE COLLECTION" title="Active & Pending Listings"
      description="Explore sample properties and filter by listing status, location, and price." />
    {loading && <section className="properties-section container" role="status"><h2>Loading demo listings…</h2><p>Retrieving property information from SimplyRETS.</p></section>}
    {!loading && error && <section className="properties-section container"><div className="empty-state"><h2>We couldn’t load the listings.</h2><p role="alert">{error}</p><button className="button" type="button" onClick={retry}>Try again</button></div></section>}
    {!loading && !error && <ListingsCollection {...listingActions} status="Active"
      statusOptions={listingStatuses} items={listings}
      sourceDescription="SimplyRETS demo API data. These are sample properties, not live offers for sale." />}
    <ContactCallout />
  </>;
}
