import homeOne from '../assets/home-one.jpg';
import homeTwo from '../assets/home-two.jpg';
import homeThree from '../assets/home-three.jpg';

// Fictional addresses, prices and dates. Photos are SimplyRETS demo assets.
// These records do not represent actual listings or completed transactions.
export const properties = [
  { id: 1, title: '124 Willow Creek Drive', city: 'Atlanta, GA', price: 625000, beds: 4, baths: 3, sqft: 2850, status: 'Active', badge: 'New listing', image: homeOne, description: 'A bright demo home with open living spaces, a spacious kitchen, and a private backyard.' },
  { id: 2, title: '86 Magnolia Lane', city: 'Marietta, GA', price: 485000, beds: 3, baths: 2, sqft: 2140, status: 'Active', badge: 'Featured', image: homeTwo, description: 'A welcoming demo property with comfortable living areas and a peaceful neighborhood setting.' },
  { id: 3, title: '315 Oakwood Terrace', city: 'Alpharetta, GA', price: 795000, beds: 5, baths: 4, sqft: 3620, status: 'Active', badge: 'Just added', image: homeThree, description: 'An expansive demo residence with large windows, generous gathering spaces, and a flexible layout.' },
  { id: 4, title: '42 Brookside Avenue', city: 'Roswell, GA', price: 540000, beds: 4, baths: 3, sqft: 2560, status: 'Sold', badge: 'Sold', soldDate: 'October 15, 2026', image: homeTwo, description: 'A fictional sold property demonstrating how completed transactions will appear on the website.' },
  { id: 5, title: '208 Cedar Grove Court', city: 'Atlanta, GA', price: 710000, beds: 4, baths: 4, sqft: 3100, status: 'Sold', badge: 'Sold', soldDate: 'September 28, 2026', image: homeOne, description: 'A sample completed sale with fictional details, price, and closing date.' },
];
