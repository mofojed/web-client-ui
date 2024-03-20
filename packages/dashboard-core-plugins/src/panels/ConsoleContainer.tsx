// Shows the Console Creator and swaps it with the console when created
import React, { Component } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { CSSTransition } from 'react-transition-group';
import memoize from 'memoize-one';
import {
  CommandHistoryStorage,
  Console,
  ConsoleConstants,
  ConsoleHistoryItemResult,
  ObjectIcon,
} from '@deephaven/console';
import {
  Button,
  ContextActions,
  CopyButton,
  Tooltip,
} from '@deephaven/components';
import Log from '@deephaven/log';
import type { dh as DhType, IdeSession } from '@deephaven/jsapi-types';
import { getCommandHistoryStorage } from '@deephaven/redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { vsInfo } from '@deephaven/icons';
import { assertNotNull } from '@deephaven/utils';
import SHORTCUTS from '../Shortcuts';
import ConsoleCreator, { ConsoleSettings } from './creator/ConsoleCreator';
import type { ServerConfigValues } from '../include/Iris';
import { RootState } from '../redux/store';
import { getWorkerKind } from './DnDUtils';
import {
  getEnterpriseCommandHistoryStorage,
  getServerConfigValues,
} from '../redux/selectors';
import './ConsoleContainer.scss';
import { ConsoleSession, isEnterpriseConsoleSession } from './ConsoleTypes';

const log = Log.module('ConsoleContainer');

function iconForType(type: string): JSX.Element {
  return <ObjectIcon type={type} />;
}

interface ConsoleContainerProps {
  consoleCreatorSettings: ConsoleSettings;
  consoleSettings: ConsoleSettings;
  focusCommandHistory: () => void;
  getDhcApi: (engine: string, jsApiUrl: string) => Promise<DhType>;
  onSessionOpen: (consoleSession: ConsoleSession) => void;
  onSessionClose: (consoleSession: ConsoleSession) => void;
  openObject: (object: unknown, session?: IdeSession) => void;
  closeObject: () => void;
  onSettingsChange: (
    consoleCreatorSettings: Partial<ConsoleSettings>,
    consoleSettings: ConsoleSettings
  ) => void;
  communityCommandHistoryStorage: CommandHistoryStorage;
  enterpriseCommandHistoryStorage: CommandHistoryStorage;
  serverConfigValues: ServerConfigValues;
}

// same as community Settings in Console.tsx

type Callback = () => void;
interface ConsoleContainerState {
  connected: boolean;
  consoleSession?: ConsoleSession;
  restarting: boolean;
  pingTimedOut: boolean;
  isFocused: boolean;

  consoleCreatorSettings: ConsoleSettings;
  consoleSettings: ConsoleSettings;
}

class ConsoleContainer extends Component<
  ConsoleContainerProps,
  ConsoleContainerState
> {
  static defaultProps = {
    consoleCreatorSettings: {},
    consoleSettings: {},
  };

  constructor(props: ConsoleContainerProps) {
    super(props);

    this.closeSessionAndUpdateState =
      this.closeSessionAndUpdateState.bind(this);
    this.handleConsoleCreatorSettingsChange =
      this.handleConsoleCreatorSettingsChange.bind(this);
    this.handleConsoleSettingsChange =
      this.handleConsoleSettingsChange.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    this.handleOpenObject = this.handleOpenObject.bind(this);
    this.handlePing = this.handlePing.bind(this);
    this.handlePingTimeout = this.handlePingTimeout.bind(this);
    this.handleSessionOpen = this.handleSessionOpen.bind(this);
    this.handleCreatorCancel = this.handleCreatorCancel.bind(this);
    this.handleWindowBeforeUnload = this.handleWindowBeforeUnload.bind(this);
    this.handleWindowUnload = this.handleWindowUnload.bind(this);
    this.restartSession = this.restartSession.bind(this);

    this.focusCallbacks = [];

    this.consoleRef = null;

    const { consoleCreatorSettings, consoleSettings } = props;

    this.state = {
      connected: false,
      consoleSession: undefined,
      restarting: false,
      pingTimedOut: false,
      isFocused: true,

      consoleCreatorSettings,
      consoleSettings,
    };
  }

  componentDidMount() {
    window.addEventListener('unload', this.handleWindowUnload);
    window.addEventListener('beforeunload', this.handleWindowBeforeUnload);
  }

  componentDidUpdate(
    prevProps: ConsoleContainerProps,
    prevState: ConsoleContainerState
  ) {
    this.sendSettingsChange(prevState, this.state);
  }

  componentWillUnmount(): void {
    this.closeSession();

    window.removeEventListener('unload', this.handleWindowUnload);
    window.removeEventListener('beforeunload', this.handleWindowBeforeUnload);
  }

  focusCallbacks: Callback[];

  consoleRef: Console | null;

  startListening(consoleSession: ConsoleSession): void {
    if (isEnterpriseConsoleSession(consoleSession)) {
      const { dh, connection } = consoleSession;
      connection.addEventListener(
        dh.QueryInfo.EVENT_DISCONNECT,
        this.handleDisconnect
      );

      connection.addEventListener(dh.QueryInfo.EVENT_PING, this.handlePing);

      connection.addEventListener(
        dh.QueryInfo.EVENT_PING_TIMEOUT,
        this.handlePingTimeout
      );
    } else {
      const { dh, connection } = consoleSession;
      connection.addEventListener(
        dh.IdeConnection.EVENT_DISCONNECT,
        this.handleDisconnect
      );
      connection.addEventListener(
        dh.IdeConnection.EVENT_RECONNECT,
        this.handleReconnect
      );
    }
  }

  stopListening(consoleSession: ConsoleSession): void {
    if (isEnterpriseConsoleSession(consoleSession)) {
      const { dh, connection } = consoleSession;
      connection.removeEventListener(
        dh.QueryInfo.EVENT_DISCONNECT,
        this.handleDisconnect
      );

      connection.removeEventListener(dh.QueryInfo.EVENT_PING, this.handlePing);

      connection.removeEventListener(
        dh.QueryInfo.EVENT_PING_TIMEOUT,
        this.handlePingTimeout
      );
    } else {
      const { dh, connection } = consoleSession;
      connection.removeEventListener(
        dh.IdeConnection.EVENT_DISCONNECT,
        this.handleDisconnect
      );
      connection.removeEventListener(
        dh.IdeConnection.EVENT_RECONNECT,
        this.handleReconnect
      );
    }
  }

  openSession(consoleSession: ConsoleSession): void {
    const { onSessionOpen } = this.props;
    this.setState({ consoleSession });
    this.startListening(consoleSession);
    onSessionOpen(consoleSession);
  }

  closeSession() {
    const { consoleSession } = this.state;
    if (consoleSession == null) {
      return;
    }
    const { onSessionClose } = this.props;
    this.stopListening(consoleSession);
    try {
      consoleSession.close();
    } catch (err) {
      log.warn('Error closing session, blocked', err);
    }
    onSessionClose(consoleSession);
  }

  handleOpenObject(object: unknown): void {
    const { openObject } = this.props;
    const { consoleSession } = this.state;
    assertNotNull(consoleSession);
    openObject(object, consoleSession.session);
  }

  handleSessionOpen(consoleSession: ConsoleSession): void {
    const { isFocused } = this.state;
    // Set connected state here to skip the console animation when focusing the tab that was connected off-screen
    this.setState({
      connected: true,
      pingTimedOut: false,
      restarting: false,
    });
    if (isFocused) {
      this.openSession(consoleSession);
    } else {
      this.focusCallbacks.push(() => this.openSession(consoleSession));
    }
  }

  handlePing(): void {
    this.setState({ pingTimedOut: false }, () => {
      // We hide console input when timed out, then show it again after we reconnect.
      // We need toupdate the dimensions of the console input editor when it re-appears, or it can't be clicked back into.
      this.updateDimensions();
    });
  }

  handlePingTimeout() {
    this.setState({ pingTimedOut: true });
  }

  handleDisconnect() {
    this.setState({ connected: false });
  }

  handleReconnect() {
    log.debug('Reconnect');
    this.setState({ connected: true });
  }

  closeSessionAndUpdateState() {
    this.closeSession();

    this.setState({
      connected: false,
      consoleSession: undefined,
    });
  }

  addCommand(command: string, focus = true, execute = false) {
    if (!this.consoleRef) {
      log.error('addCommand: undefined console ref');
      return;
    }
    this.consoleRef.addCommand(command, focus, execute);
  }

  focus() {
    log.debug2('CodeStudio focused');
    while (this.focusCallbacks.length) {
      const callback = this.focusCallbacks.shift();
      callback?.();
    }
    this.updateDimensions();
    this.setState({ isFocused: true });
  }

  blur() {
    log.debug2('CodeStudio blurred');
    this.setState({ isFocused: false });
  }

  handleWindowBeforeUnload(event: BeforeUnloadEvent) {
    const { connected } = this.state;
    // TODO: Also check for if we're in PROD mode...
    if (connected) {
      event.preventDefault();
      // returnValue is required for beforeReload event prompt
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    }
  }

  handleWindowUnload() {
    this.closeSession();
  }

  updateDimensions() {
    if (this.consoleRef) {
      this.consoleRef.updateDimensions();
    }
  }

  handleConsoleCreatorSettingsChange(consoleCreatorSettings: ConsoleSettings) {
    this.setState({ consoleCreatorSettings });
  }

  handleConsoleSettingsChange(consoleSettings: Record<string, unknown>) {
    this.setState({
      consoleSettings: consoleSettings as unknown as ConsoleSettings,
    });
  }

  sendSettingsChange(
    prevState: ConsoleContainerState,
    state: ConsoleContainerState,
    checkIfChanged = true
  ) {
    const {
      consoleCreatorSettings: prevConsoleCreatorSettings,
      consoleSettings: prevConsoleSettings,
    } = prevState;
    const { consoleCreatorSettings, consoleSettings } = state;
    if (
      checkIfChanged &&
      consoleCreatorSettings === prevConsoleCreatorSettings &&
      consoleSettings === prevConsoleSettings
    ) {
      return;
    }
    const { onSettingsChange } = this.props;
    onSettingsChange(consoleCreatorSettings, consoleSettings);
  }

  restartSession() {
    const { consoleSession } = this.state;
    if (consoleSession) {
      this.setState({ restarting: true });
      this.closeSessionAndUpdateState();
    }
  }

  handleCreatorCancel() {
    this.setState({ restarting: false });
  }

  getActions = memoize(() => [
    {
      title: 'Restart',
      action: this.restartSession,
      group: ContextActions.groups.medium,
      order: 50,
      shortcut: SHORTCUTS.CONSOLE.RESTART,
    },
    {
      title: 'Disconnect',
      action: this.closeSessionAndUpdateState,
      group: ContextActions.groups.medium,
      order: 60,
      shortcut: SHORTCUTS.CONSOLE.DISCONNECT,
    },
  ]);

  getHistoryChildren = memoize(
    (
      session: IdeSession | undefined,
      connected: boolean,
      pingTimedOut: boolean
    ) => {
      if (session == null || (connected && !pingTimedOut)) {
        return null;
      }
      const isUnresponsive = connected && pingTimedOut;
      const disconnectMessage = isUnresponsive ? (
        <>
          The worker has become un-responsive, you can wait for it to become
          responsive or kill and restart the session.
        </>
      ) : (
        <>Console session disconnected</>
      );
      return (
        <div className="console-history-footer">
          <ConsoleHistoryItemResult>
            <div className="console-disconnected-info">
              <div className="console-disconnected-info-message">
                {disconnectMessage}
              </div>
              <div className="console-disconnected-info-button">
                {isUnresponsive && (
                  <Button
                    kind="primary"
                    className="btn-console"
                    onClick={this.handlePing}
                  >
                    Wait
                  </Button>
                )}
                <Button
                  kind={isUnresponsive ? 'secondary' : 'primary'}
                  className="btn-console"
                  onClick={this.restartSession}
                >
                  Restart Session
                </Button>
                <Button
                  kind="secondary"
                  className="btn-console"
                  onClick={this.closeSessionAndUpdateState}
                >
                  End Session
                </Button>
              </div>
            </div>
          </ConsoleHistoryItemResult>
        </div>
      );
    }
  );

  getStatusBarChildren = memoize((consoleSession: ConsoleSession) => {
    const { serverConfigValues } = this.props;
    const isEnterprise = isEnterpriseConsoleSession(consoleSession);
    const { config, language, sessionDetails } = consoleSession;
    const engine =
      getWorkerKind(config.workerKind, serverConfigValues.workerKinds)?.title ??
      '';
    const workerId = ConsoleCreator.getRemoteQueryDispatcherName(
      sessionDetails.workerName ?? ''
    );
    const { processInfoId } = sessionDetails;
    return (
      <>
        <div>&nbsp;</div>
        <div>{workerId}</div>
        <div>•</div>
        <div>
          {ConsoleConstants.LANGUAGE_MAP.get(language ?? '') ?? language}
        </div>
        <div>•</div>
        <div>{`${(config.maxHeapMb / 1024.0).toFixed(1)} GB`}</div>
        <div>•</div>
        <div>
          {config.dispatcherHost}{' '}
          <FontAwesomeIcon icon={vsInfo} transform="grow-3 down-1" />
          <Tooltip interactive>
            <dl className="console-pane-status-details">
              <dt>Description</dt>
              <dd>{config.queryDescription}</dd>
              <dt>Engine</dt>
              <dd>{engine}</dd>
              {!isEnterprise && (
                <>
                  <dt>Version</dt>
                  <dd>{consoleSession.engineVersion}</dd>
                </>
              )}
              <dt>Worker</dt>
              <dd>{workerId}</dd>
              <dt>Host</dt>
              <dd>{config.dispatcherHost}</dd>
              {isEnterprise && (
                <>
                  <dt>Port</dt>
                  <dd>{config.dispatcherPort}</dd>
                </>
              )}
              <dt>Process Info Id</dt>
              <dd>
                {processInfoId}
                <CopyButton copy={`${processInfoId}`} />
              </dd>
              <dt>Max heap (MB)</dt>
              <dd>{config.maxHeapMb}</dd>
              <dt>JVM Profile</dt>
              <dd>{config.jvmProfile}</dd>
              <dt>JVM Args</dt>
              <dd>
                {config.jvmArgs.join('\n') || (
                  <span className="text-muted">None</span>
                )}
              </dd>
              <dt>ENV Vars</dt>
              <dd>
                {config.envVars.map(item => item.join('=')).join('\n') || (
                  <span className="text-muted">None</span>
                )}
              </dd>
            </dl>
          </Tooltip>
        </div>
        <div>•</div>
      </>
    );
  });

  render() {
    const {
      closeObject,
      enterpriseCommandHistoryStorage,
      communityCommandHistoryStorage,
      focusCommandHistory,
      getDhcApi,
    } = this.props;
    const {
      connected,
      consoleCreatorSettings,
      consoleSettings,
      pingTimedOut,
      restarting,
      consoleSession,
    } = this.state;

    const { dh, language, session, sessionId } = consoleSession ?? {};
    const isEnterprise =
      consoleSession != null && isEnterpriseConsoleSession(consoleSession);

    const actions = this.getActions();
    const isSessionLoaded = session != null;
    const isDisconnected = isSessionLoaded && !connected;
    const historyChildren = this.getHistoryChildren(
      session,
      connected,
      pingTimedOut
    );
    const statusBarChildren =
      consoleSession != null ? this.getStatusBarChildren(consoleSession) : null;

    return (
      <div
        className={classNames('console-container', {
          disconnected: isDisconnected,
          timeout: pingTimedOut,
        })}
      >
        <CSSTransition
          in={!isSessionLoaded}
          timeout={250}
          classNames="fade"
          unmountOnExit
        >
          <div className="fill-parent-absolute">
            <ConsoleCreator
              getDhcApi={getDhcApi}
              settings={consoleCreatorSettings}
              onSessionOpen={this.handleSessionOpen}
              onCancel={this.handleCreatorCancel}
              onSettingsChange={this.handleConsoleCreatorSettingsChange}
              connectOnMount={restarting}
            />
          </div>
        </CSSTransition>
        <CSSTransition
          in={isSessionLoaded}
          timeout={250}
          classNames="fade"
          mountOnEnter
          unmountOnExit
        >
          <div className="fill-parent-absolute">
            {isSessionLoaded && language !== undefined && dh != null && (
              <Console
                dh={dh}
                ref={consoleRef => {
                  this.consoleRef = consoleRef;
                }}
                actions={actions}
                commandHistoryStorage={
                  isEnterprise
                    ? enterpriseCommandHistoryStorage
                    : communityCommandHistoryStorage
                }
                settings={consoleSettings}
                session={session}
                focusCommandHistory={focusCommandHistory}
                openObject={this.handleOpenObject}
                closeObject={closeObject}
                onSettingsChange={this.handleConsoleSettingsChange}
                language={language}
                scope={sessionId}
                historyChildren={historyChildren}
                statusBarChildren={statusBarChildren}
                disabled={isDisconnected || pingTimedOut}
                iconForType={iconForType}
              />
            )}
          </div>
        </CSSTransition>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  communityCommandHistoryStorage: getCommandHistoryStorage(
    state
  ) as CommandHistoryStorage,
  enterpriseCommandHistoryStorage: getEnterpriseCommandHistoryStorage(
    state
  ) as CommandHistoryStorage,
  serverConfigValues: getServerConfigValues(state),
});

export default connect(mapStateToProps, null, null, { forwardRef: true })(
  ConsoleContainer
);
