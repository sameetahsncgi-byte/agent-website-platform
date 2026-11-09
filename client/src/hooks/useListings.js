import { useEffect, useState } from "react";
import { fetchListings } from "../services/listings.js";

export default function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    async function load() {
      try {
        const results = await fetchListings(controller.signal);

        if (!controller.signal.aborted) {
          setListings(results);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message || "Unable to load listings.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [attempt]);

  return {
    listings,
    loading,
    error,
    retry: () => setAttempt((current) => current + 1),
  };
}