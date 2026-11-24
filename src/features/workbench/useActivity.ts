import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, type ActivityEvent } from '../../api/client';
import { eventMatches, type AgentRole } from './agents';

/** Activity is re-read this often while the live stream is down. */
const POLL_MS = 5000;
/** While the stream is live a slow re-read still covers silently dropped messages. */
const LIVE_POLL_MS = 30000;

export function useActivity(projectId: string, role: AgentRole | 'all' = 'all', enabled = true) {
  const client = useQueryClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connection, setConnection] = useState('connecting');
  const [error, setError] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    let disposed = false;
    let stream: EventSource | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let cursor = 0;
    let polling = false;
    let initialized = false;
    let live = false;
    let lastPoll = 0;
    setEvents([]);
    setHasOlder(false);
    setLoadingOlder(false);
    setConnection('connecting');
    setError('');
    if (!enabled) return;
    function refresh() {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        // Events are the signal that project state or files changed.
        for (const key of ['project', 'files', 'log', 'file'])
          client.invalidateQueries({ queryKey: [key, projectId] });
        refreshTimer = undefined;
      }, 500);
    }
    function merge(incoming: ActivityEvent[]) {
      if (disposed || generation.current !== current) return;
      cursor = Math.max(cursor, ...incoming.map((event) => event.id));
      setEvents((previous) =>
        [
          ...new Map(
            [...previous, ...incoming.filter((event) => eventMatches(event, role))].map((event) => [
              event.id,
              event,
            ]),
          ).values(),
        ].sort((a, b) => a.id - b.id),
      );
      if (incoming.length) refresh();
    }
    async function poll() {
      if (polling || disposed) return;
      polling = true;
      lastPoll = Date.now();
      try {
        let more = true;
        while (more && !disposed) {
          const page = await api.activity(projectId, {
            ...(initialized ? { after: cursor } : {}),
            ...(role === 'all' ? {} : { role }),
          });
          if (disposed) return;
          if (!initialized) {
            setHasOlder(page.has_more);
            initialized = true;
            more = false;
          } else more = page.has_more && page.events.length > 0;
          merge(page.events);
        }
        setError('');
      } catch (reason) {
        if (!disposed) setError((reason as Error).message);
      } finally {
        polling = false;
      }
    }
    async function connect() {
      await poll();
      if (disposed) return;
      stream = new EventSource(`/api/projects/${projectId}/events?after=${cursor}`);
      stream.onopen = () => {
        live = true;
        setConnection('connected');
      };
      stream.onerror = () => {
        live = false;
        setConnection('reconnecting');
      };
      stream.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as ActivityEvent;
          if (Number.isInteger(event.id) && event.project_id === projectId && event.data)
            merge([event]);
        } catch {
          // Polling recovers an interrupted or malformed stream message.
        }
      };
    }
    void connect();
    const interval = setInterval(() => {
      if (!live || Date.now() - lastPoll >= LIVE_POLL_MS) void poll();
    }, POLL_MS);
    return () => {
      disposed = true;
      stream?.close();
      clearInterval(interval);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [projectId, client, role, enabled]);

  async function loadOlder() {
    if (loadingOlder || !events.length) return;
    const current = generation.current;
    setLoadingOlder(true);
    try {
      const page = await api.activity(projectId, {
        before: events[0].id,
        ...(role === 'all' ? {} : { role }),
      });
      if (generation.current !== current) return;
      setEvents((previous) =>
        [...new Map([...page.events, ...previous].map((event) => [event.id, event])).values()].sort(
          (a, b) => a.id - b.id,
        ),
      );
      setHasOlder(page.has_more);
      setError('');
    } catch (reason) {
      if (generation.current === current) setError((reason as Error).message);
    } finally {
      if (generation.current === current) setLoadingOlder(false);
    }
  }
  return { events, connection, error, hasOlder, loadingOlder, loadOlder };
}
