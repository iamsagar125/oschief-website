import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

function getRedis() {
  const url = import.meta.env.KV_REST_API_URL || process.env.KV_REST_API_URL || import.meta.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN || import.meta.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redis = getRedis();
    if (!redis) {
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use a Redis set for deduplication
    const added = await redis.sadd('waitlist', email);
    if (added === 0) {
      return new Response(JSON.stringify({ error: 'already_subscribed' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const count = await redis.scard('waitlist');

    return new Response(JSON.stringify({ ok: true, count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = import.meta.env.ADMIN_SECRET || process.env.ADMIN_SECRET || '';

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const redis = getRedis();
  if (!redis) {
    return new Response(JSON.stringify({ error: 'storage_not_configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subscribers = await redis.smembers('waitlist');
  return new Response(JSON.stringify({ count: subscribers.length, subscribers }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
