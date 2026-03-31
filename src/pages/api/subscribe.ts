import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

const SUBSCRIBERS_FILE = path.join(process.cwd(), 'subscribers.json');

function getSubscribers(): string[] {
  try {
    const data = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveSubscribers(emails: string[]) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(emails, null, 2));
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

    const subscribers = getSubscribers();
    if (subscribers.includes(email)) {
      return new Response(JSON.stringify({ error: 'already_subscribed' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    subscribers.push(email);
    saveSubscribers(subscribers);

    return new Response(JSON.stringify({ ok: true, count: subscribers.length }), {
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
  const expectedSecret = process.env.ADMIN_SECRET || '';

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const subscribers = getSubscribers();
  return new Response(JSON.stringify({ count: subscribers.length, subscribers }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
