import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vsListUnordered, vsDebugAlt } from '@deephaven/icons';
import Sidebar, { type SidebarItem } from './Sidebar';

const items: SidebarItem[] = [
  { key: 'widgets', icon: vsListUnordered, title: 'Widgets' },
  { key: 'debug', icon: vsDebugAlt, title: 'Debug tools' },
];

function renderSidebar(
  props: Partial<React.ComponentProps<typeof Sidebar>> = {}
) {
  const onSelect = props.onSelect ?? jest.fn();
  render(
    <Sidebar
      items={items}
      selectedKey="widgets"
      onSelect={onSelect}
      renderContent={key => <div data-testid="content">content: {key}</div>}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
  return { onSelect };
}

it('renders a tab for each item', () => {
  renderSidebar();
  expect(screen.getAllByRole('tab')).toHaveLength(items.length);
});

it('marks the selected item and renders its content', () => {
  renderSidebar({ selectedKey: 'debug' });
  expect(screen.getByRole('tab', { name: 'Debug tools' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getByTestId('content')).toHaveTextContent('content: debug');
});

it('does not render the content panel when collapsed', () => {
  renderSidebar({ selectedKey: null });
  expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  expect(screen.queryByTestId('content')).not.toBeInTheDocument();
});

it('selects an unselected item', async () => {
  const user = userEvent.setup();
  const { onSelect } = renderSidebar({ selectedKey: 'widgets' });
  await user.click(screen.getByRole('tab', { name: 'Debug tools' }));
  expect(onSelect).toHaveBeenCalledWith('debug');
});

it('toggles the panel closed when selecting the active item', async () => {
  const user = userEvent.setup();
  const { onSelect } = renderSidebar({ selectedKey: 'widgets' });
  await user.click(screen.getByRole('tab', { name: 'Widgets' }));
  expect(onSelect).toHaveBeenCalledWith(null);
});

it('moves focus between tabs with the arrow keys', async () => {
  const user = userEvent.setup();
  renderSidebar({ selectedKey: 'widgets' });
  const [widgetsTab, debugTab] = screen.getAllByRole('tab');
  widgetsTab.focus();
  await user.keyboard('{ArrowDown}');
  expect(debugTab).toHaveFocus();
  await user.keyboard('{ArrowUp}');
  expect(widgetsTab).toHaveFocus();
});
