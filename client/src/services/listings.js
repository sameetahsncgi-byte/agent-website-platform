const placeholderImage =
  "data:image/svg+xml," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
      <rect width="100%" height="100%" fill="#e7ede7"/>
      <text x="50%" y="50%" text-anchor="middle"
        font-family="Arial" font-size="22" fill="#526557">
        Image not available
      </text>
    </svg>
  `);

function getBathrooms(property) {
  if (Number.isFinite(property.bathrooms)) {
    return property.bathrooms;
  }

  const counts = [
    property.bathsFull,
    property.bathsHalf,
    property.bathsThreeQuarter,
  ];

  if (!counts.some(Number.isFinite)) return "—";

  return (
    (property.bathsFull ?? 0) +
    (property.bathsHalf ?? 0) * 0.5 +
    (property.bathsThreeQuarter ?? 0) * 0.75
  );
}

export async function fetchListings(signal) {
  const response = await fetch("/api/listings", { signal });

  if (!response.ok) {
    throw new Error(
      "Unable to load listings. Check that the backend is running."
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      "The API returned a webpage. Check the Vite proxy configuration."
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.listings)) {
    throw new Error("The API returned an unexpected response.");
  }

  return data.listings
    .filter(
      (listing) =>
        listing.mlsId != null &&
        Number.isFinite(listing.listPrice)
    )
    .map((listing) => {
      const property = listing.property || {};
      const address = listing.address || {};

      return {
        id: `simplyrets-${listing.mlsId}`,
        title: address.full || "Address not provided",
        city: [address.city, address.state].filter(Boolean).join(", "),
        price: listing.listPrice,
        beds: property.bedrooms ?? "—",
        baths: getBathrooms(property),
        sqft: property.area ?? "—",
        status: listing.mls?.status || "Unknown",
        badge: listing.mls?.status || "Demo listing",
        image: listing.photos?.[0] || placeholderImage,
        description:
          listing.remarks || "No public description is available.",
      };
    });
}