import PageIntro from '../components/PageIntro.jsx';
import ListingsCollection from '../components/ListingsCollection.jsx';
import ContactCallout from '../components/ContactCallout.jsx';

export default function SoldListings(listingActions) {
  return <><PageIntro eyebrow="COMPLETED CHAPTERS" title="Sold Listings" description="A separate collection demonstrating how past sales will appear on your website." />
    <ListingsCollection status="Sold" {...listingActions} /><ContactCallout /></>;
}
