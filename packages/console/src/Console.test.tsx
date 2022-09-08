import React from 'react';
import dh from '@deephaven/jsapi-shim';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Console } from './Console';
import { CommandHistoryStorage } from './command-history';

function makeMockCommandHistoryStorage(): CommandHistoryStorage {
  return {
    addItem: jest.fn(),
    getTable: jest.fn(),
    updateItem: jest.fn(),
    listenItem: jest.fn(),
  };
}

jest.mock(
  './ConsoleInput',
  () =>
    function MockConsoleInput({ onSubmit }) {
      return <input onSubmit={event => onSubmit(event.target.value)} />;
    }
);
jest.mock('./Console', () => ({
  ...(jest.requireActual('./Console') as Record<string, unknown>),
  commandHistory: jest.fn(),
}));

function makeConsoleWrapper() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = new (dh as any).IdeSession('test');
  const commandHistoryStorage = makeMockCommandHistoryStorage();
  return render(
    <Console
      commandHistoryStorage={commandHistoryStorage}
      focusCommandHistory={() => undefined}
      openObject={() => undefined}
      closeObject={() => undefined}
      session={session}
      language="test"
    />
  );
}

it('renders without crashing', () => {
  makeConsoleWrapper();
});

it('doesnt add blank items to history', async () => {
  const { container } = makeConsoleWrapper();

  // const consoleInput = container.querySelector('.console-input');
  const consoleInput = screen.getByRole('textbox');

  if (!consoleInput) {
    throw new Error('console input is null');
  }
  // Monaco editor doesn't have a native input, so need to just click into it and type on the page
  // https://github.com/microsoft/playwright/issues/14126

  await userEvent.click(consoleInput);

  await userEvent.type(consoleInput, 'print("Foo"){enter}');
  await userEvent.type(consoleInput, '{enter}');
  await userEvent.type(consoleInput, 'print("Bar"){enter}');

  await userEvent.type(consoleInput, '{up}');
  expect(consoleInput.textContent).toBe('print("Bar")');
});
