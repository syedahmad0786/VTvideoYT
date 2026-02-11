// ─── Google Calendar Integration ──────────────────────────────
// View A'Y calendar, create events as Malik, time-block optimization.

import { google } from 'googleapis';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getCalendar() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return google.calendar({ version: 'v3', auth });
}

/**
 * List upcoming events
 */
export async function listEvents(calendarId = 'primary', maxResults = 20, timeMin = null) {
  const calendar = getCalendar();
  if (!calendar) return { error: 'Calendar not authenticated' };

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return {
      events: res.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        attendees: event.attendees?.map(a => a.email),
        status: event.status,
        htmlLink: event.htmlLink,
      })),
    };
  } catch (error) {
    logger.error('CALENDAR', 'Failed to list events', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Create a calendar event (as Malik, invite A'Y)
 */
export async function createEvent({
  summary,
  description,
  startTime,
  endTime,
  attendees = [],
  location,
  calendarId = 'primary',
}) {
  const calendar = getCalendar();
  if (!calendar) return { error: 'Calendar not authenticated' };

  try {
    const event = {
      summary,
      description,
      start: { dateTime: startTime, timeZone: 'Asia/Dubai' },
      end: { dateTime: endTime, timeZone: 'Asia/Dubai' },
      attendees: attendees.map(email => ({ email })),
      reminders: { useDefault: true },
    };

    if (location) event.location = location;

    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'all',
    });

    logger.info('CALENDAR', `Event created: ${summary}`);
    return {
      eventId: res.data.id,
      summary: res.data.summary,
      htmlLink: res.data.htmlLink,
      start: res.data.start,
      end: res.data.end,
    };
  } catch (error) {
    logger.error('CALENDAR', 'Failed to create event', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Get free/busy information for time-block optimization
 */
export async function getFreeBusy(timeMin, timeMax, calendarIds = ['primary']) {
  const calendar = getCalendar();
  if (!calendar) return { error: 'Calendar not authenticated' };

  try {
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'Asia/Dubai',
        items: calendarIds.map(id => ({ id })),
      },
    });

    return res.data.calendars;
  } catch (error) {
    logger.error('CALENDAR', 'Failed to get free/busy', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(eventId, updates, calendarId = 'primary') {
  const calendar = getCalendar();
  if (!calendar) return { error: 'Calendar not authenticated' };

  try {
    const res = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updates,
      sendUpdates: 'all',
    });

    logger.info('CALENDAR', `Event updated: ${res.data.summary}`);
    return {
      eventId: res.data.id,
      summary: res.data.summary,
      htmlLink: res.data.htmlLink,
    };
  } catch (error) {
    logger.error('CALENDAR', 'Failed to update event', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId, calendarId = 'primary') {
  const calendar = getCalendar();
  if (!calendar) return { error: 'Calendar not authenticated' };

  try {
    await calendar.events.delete({ calendarId, eventId });
    logger.info('CALENDAR', `Event deleted: ${eventId}`);
    return { success: true };
  } catch (error) {
    logger.error('CALENDAR', 'Failed to delete event', { error: error.message });
    return { error: error.message };
  }
}
