export const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(value);

export function filterProperties(properties, status, search, budget) {
  const query = search.toLowerCase().trim();
  return properties.filter(property => (status === 'All' || property.status === status)
    && `${property.title} ${property.city}`.toLowerCase().includes(query)
    && (budget === 'all' || property.price <= Number(budget)));
}
