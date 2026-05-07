import Log from '@deephaven/log';
import type {
  NodeId,
  PanelNode,
  SerializedLayoutState,
  Transform,
} from '../types';

const log = Log.module('@deephaven/layout/PopoutBridge');

export type PopoutMessage =
  | { type: 'state'; state: SerializedLayoutState }
  | { type: 'panelState'; panelId: NodeId; state: unknown }
  | { type: 'closePopout'; panelId: NodeId }
  | {
      type: 'updateGeometry';
      panelId: NodeId;
      screenX: number;
      screenY: number;
      width: number;
      height: number;
    }
  /** A popout asks the parent to apply a transform on the master state. */
  | { type: 'transform'; transform: Transform }
  /**
   * Source window announces a cross-window panel drag. Receivers latch
   * onto this and treat dragenter as the start of a local drag.
   * `sourceWindowId` identifies the originating window (popoutId, or
   * `null` for the parent). `panel` is the full panel data so the
   * destination can dispatch addPanel without consulting the source.
   */
  | {
      type: 'crossDragStart';
      sourceWindowId: NodeId | null;
      panel: PanelNode;
    }
  /**
   * Destination window confirms it accepted the cross-window drop;
   * source must remove its copy of the panel.
   */
  | {
      type: 'crossDragComplete';
      sourceWindowId: NodeId | null;
      panelId: NodeId;
    }
  /** A drag was cancelled or never landed. Source can discard pending state. */
  | { type: 'crossDragCancel'; sourceWindowId: NodeId | null; panelId: NodeId }
  /**
   * Parent → popouts liveness ping. Popouts treat extended silence as the
   * parent having closed and self-close after a grace period; this lets a
   * brief refresh of the parent stay invisible to the popouts.
   */
  | { type: 'heartbeat' }
  /**
   * Parent → popouts: "any popout out there, identify yourself." Sent on
   * parent mount so a freshly refreshed parent can avoid re-opening
   * popouts that are still alive from before its refresh.
   */
  | { type: 'discoverPopouts' }
  /**
   * Popout → parent: this popout window is alive. Sent on mount and in
   * response to discoverPopouts.
   */
  | { type: 'popoutAlive'; panelId: NodeId };

export type PopoutMessageHandler = (msg: PopoutMessage) => void;

/**
 * Thin wrapper over BroadcastChannel that names itself after a layout
 * storage key, so the parent dashboard and all of its popped-out children
 * speak on the same channel without needing to negotiate. Falls back to a
 * no-op when BroadcastChannel is unavailable (older browsers, SSR).
 */
export default class PopoutBridge {
  private channel: BroadcastChannel | null;

  private handlers = new Set<PopoutMessageHandler>();

  constructor(storageKey: string) {
    if (
      typeof BroadcastChannel === 'undefined' ||
      typeof window === 'undefined'
    ) {
      this.channel = null;
      return;
    }
    try {
      this.channel = new BroadcastChannel(`dh-layout:${storageKey}`);
      this.channel.addEventListener('message', this.handleMessage);
    } catch (e) {
      log.warn('BroadcastChannel unavailable, popout sync disabled:', e);
      this.channel = null;
    }
  }

  private handleMessage = (e: MessageEvent<PopoutMessage>): void => {
    this.handlers.forEach(h => {
      try {
        h(e.data);
      } catch (err) {
        log.warn('PopoutBridge handler threw:', err);
      }
    });
  };

  send(msg: PopoutMessage): void {
    if (this.channel == null) return;
    try {
      this.channel.postMessage(msg);
    } catch (e) {
      log.warn('Failed to post popout message:', e);
    }
  }

  subscribe(handler: PopoutMessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    if (this.channel == null) return;
    this.channel.removeEventListener('message', this.handleMessage);
    this.channel.close();
    this.channel = null;
    this.handlers.clear();
  }
}
