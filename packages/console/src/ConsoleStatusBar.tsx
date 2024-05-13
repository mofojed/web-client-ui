import React, {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import classNames from 'classnames';
import { vsKebabVertical } from '@deephaven/icons';
import type { dh as DhType } from '@deephaven/jsapi-types';
import {
  Button,
  createXComponent,
  DropdownActions,
  DropdownMenu,
  PopperOptions,
  Tooltip,
} from '@deephaven/components';
import './ConsoleStatusBar.scss';

const POPPER_OPTIONS: PopperOptions = { placement: 'bottom-end' };

interface ConsoleStatusBarProps {
  children?: ReactNode;
  dh: typeof DhType;
  session: DhType.IdeSession;
  actions?: DropdownActions;
}

function ConsoleStatusBar({
  children,
  dh,
  session,
  actions,
}: ConsoleStatusBarProps): ReactElement {
  const [isCommandRunning, setIsCommandRunning] = useState(false);

  const handleCommandStarted = useCallback(async (event: CustomEvent) => {
    setIsCommandRunning(true);

    const { result } = event.detail;
    try {
      await result;
    } catch (error) {
      // No-op, fall through
    }

    setIsCommandRunning(false);
  }, []);

  useEffect(
    function startListening() {
      session.addEventListener(
        dh.IdeSession.EVENT_COMMANDSTARTED,
        handleCommandStarted
      );

      return function stopListening() {
        session.removeEventListener(
          dh.IdeSession.EVENT_COMMANDSTARTED,
          handleCommandStarted
        );
      };
    },
    [dh, handleCommandStarted, session]
  );

  let statusIconClass = null;
  let tooltipText = null;
  if (isCommandRunning) {
    // Connected, Pending
    statusIconClass = 'console-status-icon-pending';
    tooltipText = 'Worker is busy';
  } else {
    // Connected, Idle
    statusIconClass = 'console-status-icon-idle';
    tooltipText = 'Worker is idle';
  }

  const hasActions =
    actions != null && (!Array.isArray(actions) || actions.length > 0);

  return (
    <div className="console-pane-status-bar">
      <div>
        <div className={classNames('console-status-icon', statusIconClass)} />
        <Tooltip>{tooltipText}</Tooltip>
      </div>
      {children}
      {hasActions && (
        <Button
          kind="ghost"
          icon={vsKebabVertical}
          tooltip="More Actions..."
          aria-label="More Actions..."
          onClick={() => {
            // no-op: click is handled in `DropdownMenu`
          }}
        >
          <DropdownMenu actions={actions} popperOptions={POPPER_OPTIONS} />
        </Button>
      )}
    </div>
  );
}

const XConsoleStatusBar = createXComponent(ConsoleStatusBar);

export default XConsoleStatusBar;
