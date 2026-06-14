'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to fetch the current user's first group ID.
 * All pages need a group_id to query data from the API.
 * Returns the group ID, loading state, and any error.
 */
export function useGroupId() {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGroup() {
      try {
        const res = await fetch('/api/groups');
        const json = await res.json();

        if (!cancelled) {
          if (json.success && json.data?.length > 0) {
            setGroupId(json.data[0].id);
          } else {
            setError('No group found');
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load group');
          setLoading(false);
        }
      }
    }

    fetchGroup();
    return () => { cancelled = true; };
  }, []);

  return { groupId, loading, error };
}
