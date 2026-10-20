import fs from "node:fs/promises";
import path from "node:path";

const MEETUP_EVENTS_URL = "https://www.meetup.com/louisvillemakesgames/events/";
const FALLBACK_EVENT_URLS = [
  "https://www.meetup.com/louisvillemakesgames/events/316892073/?eventOrigin=group_events_list"
];
const OUTPUT_PATH = path.resolve("./events-feed/events.json");

function plusTwoMonths(date) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + 2);
  return copy;
}

function isWithinTwoMonths(startIso, now = new Date()) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return false;
  const cutoff = plusTwoMonths(now);
  return start >= now && start <= cutoff;
}

function findNextDataJson(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Could not find __NEXT_DATA__ JSON in Meetup page");
  }
  return JSON.parse(match[1]);
}

function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function venueLabel(venue) {
  if (!venue) return "";
  const chunks = [venue.name, venue.city, venue.state].filter(Boolean);
  return chunks.join(" - ");
}

function pickPhotoUrl(photo) {
  if (!photo) return null;
  return photo.highResUrl || photo.photoLink || photo.highresLink || photo.baseUrl || null;
}

function mapMeetupEvents(apolloState) {
  const rows = [];

  for (const [key, value] of Object.entries(apolloState)) {
    if (!key.startsWith("Event:") || !value || value.status !== "ACTIVE") continue;

    const venue = value.venue?.__ref ? apolloState[value.venue.__ref] : null;
    const photo = value.displayPhoto?.__ref ? apolloState[value.displayPhoto.__ref] : null;

    rows.push({
      id: `meetup-${value.id}`,
      source: "meetup",
      title: cleanText(value.title),
      start: value.dateTime,
      end: value.endTime || null,
      location: venueLabel(venue),
      url: value.eventUrl || null,
      image: pickPhotoUrl(photo)
    });
  }

  const deduped = new Map();
  for (const event of rows) {
    const key = `${event.title}|${event.start}`;
    if (!deduped.has(key)) deduped.set(key, event);
  }

  return Array.from(deduped.values())
    .filter(event => isWithinTwoMonths(event.start))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function mapEventFromApollo(apolloState, eventId) {
  const event = Object.values(apolloState).find(value => value && value.__typename === "Event" && String(value.id) === String(eventId));
  if (!event || event.status !== "ACTIVE") return null;

  const venue = event.venue?.__ref ? apolloState[event.venue.__ref] : null;
  const photo = event.displayPhoto?.__ref ? apolloState[event.displayPhoto.__ref] : null;

  return {
    id: `meetup-${event.id}`,
    source: "meetup",
    title: cleanText(event.title),
    start: event.dateTime,
    end: event.endTime || null,
    location: venueLabel(venue),
    url: event.eventUrl || null,
    image: pickPhotoUrl(photo)
  };
}

function eventIdFromUrl(url) {
  const match = String(url).match(/\/events\/(\w+)\//);
  return match ? match[1] : null;
}

async function fetchFallbackEvent(url) {
  const eventId = eventIdFromUrl(url);
  if (!eventId) return null;

  const response = await fetch(url);
  if (!response.ok) return null;

  const html = await response.text();
  const nextData = findNextDataJson(html);
  const apollo = nextData?.props?.pageProps?.__APOLLO_STATE__;
  if (!apollo) return null;

  return mapEventFromApollo(apollo, eventId);
}

async function run() {
  const response = await fetch(MEETUP_EVENTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Meetup events page: ${response.status}`);
  }

  const html = await response.text();
  const nextData = findNextDataJson(html);
  const apollo = nextData?.props?.pageProps?.__APOLLO_STATE__;

  if (!apollo) {
    throw new Error("Meetup page is missing __APOLLO_STATE__ data");
  }

  const meetupEvents = mapMeetupEvents(apollo);
  const fallbackEvents = (await Promise.all(FALLBACK_EVENT_URLS.map(fetchFallbackEvent))).filter(Boolean);

  const events = [...meetupEvents, ...fallbackEvents]
    .filter(event => isWithinTwoMonths(event.start))
    .filter((event, index, list) => list.findIndex(item => item.id === event.id) === index)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(events, null, 2));
  console.log(`Wrote ${events.length} events to ${OUTPUT_PATH}`);
}

run().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
