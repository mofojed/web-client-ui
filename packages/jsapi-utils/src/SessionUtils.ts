import type { dh as DhType } from '@deephaven/jsapi-types';
import Log from '@deephaven/log';
import shortid from 'shortid';
import { requestParentResponse, SESSION_DETAILS_REQUEST } from './MessageUtils';
import NoConsolesError, { isNoConsolesError } from './NoConsolesError';

const log = Log.module('SessionUtils');

export interface SessionConfig {
  /** Language used for the session */
  language: string;
}

export interface SessionWrapper {
  /** Session object being wrapped */
  session: DhType.IdeSession;

  /** Configuration used to create the session */
  config: SessionConfig;

  /** API used when creating the session */
  dh: typeof DhType;

  /** Unique ID of the session */
  id: string;
}

/**
 * @returns New connection to the server
 */
export function createConnection(
  dh: typeof DhType,
  websocketUrl: string
): DhType.IdeConnection {
  log.info(`Starting connection to '${websocketUrl}'...`);

  return new dh.IdeConnection(websocketUrl);
}

/**
 * Create a new session using the default URL
 * @returns A session and config that is ready to use
 */
export async function createSessionWrapper(
  dh: typeof DhType,
  connection: DhType.IdeConnection
): Promise<SessionWrapper> {
  log.info('Getting console types...');

  const types = await connection.getConsoleTypes();

  if (types.length === 0) {
    throw new NoConsolesError('No console types available');
  }

  log.info('Available types:', types);

  const type = types[0];

  log.info('Starting session with type', type);

  const session = await connection.startSession(type);

  const config = { language: type };

  const id = shortid.generate();

  log.info('Console session established', config);

  return { config, dh, id, session };
}

export function createCoreClient(
  dh: typeof DhType,
  websocketUrl: string,
  options?: DhType.ConnectOptions
): DhType.CoreClient {
  log.info('createCoreClient', websocketUrl);

  return new dh.CoreClient(websocketUrl, options);
}

export async function loadSessionWrapper(
  dh: typeof DhType,
  connection: DhType.IdeConnection
): Promise<SessionWrapper | undefined> {
  let sessionWrapper: SessionWrapper | undefined;
  try {
    sessionWrapper = await createSessionWrapper(dh, connection);
  } catch (e) {
    // Consoles may be disabled on the server, but we should still be able to start up and open existing objects
    if (!isNoConsolesError(e)) {
      throw e;
    }
  }
  return sessionWrapper;
}
