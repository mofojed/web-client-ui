import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

let boundingRectSpy: jest.SpyInstance;

beforeEach(() => {
  boundingRectSpy = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 0, 800, 600));
});

afterEach(() => {
  boundingRectSpy.mockRestore();
});

it('renders every example option', async () => {
  render(<App />);
  expect(screen.getByTestId('example-scatter')).toBeTruthy();
  expect(screen.getByTestId('example-line')).toBeTruthy();
  expect(screen.getByTestId('example-streaming')).toBeTruthy();
  expect(screen.getByTestId('renderer-select')).toBeTruthy();

  // WebGPU is unavailable in jsdom, so the canvas renderer should be selected
  const renderer = await screen.findByTestId('active-renderer');
  expect(renderer.textContent).toBe('canvas');
});

it('puts six streaming plots on the cube and starts them immediately', async () => {
  const { container } = render(<App />);
  fireEvent.click(screen.getByTestId('example-cube'));

  expect(screen.getByTestId('plot-cube')).toBeTruthy();
  expect(container.querySelectorAll('.plot-cube-face')).toHaveLength(6);
  expect(container.querySelectorAll('.plot-demo-plot')).toHaveLength(6);
  expect(screen.getByText('Oscilloscope')).toBeTruthy();
  expect(screen.getByTestId('toggle-streaming').textContent).toBe(
    'Stop stream'
  );

  await waitFor(() =>
    expect(
      container.querySelectorAll('[data-dh-plot-status=ready]')
    ).toHaveLength(6)
  );
  await waitFor(() =>
    expect(screen.getByTestId('plot-stats').textContent).toMatch(/\d+ ms$/)
  );

  fireEvent.click(screen.getByTestId('toggle-streaming'));
  expect(screen.getByTestId('toggle-streaming').textContent).toBe(
    'Start stream'
  );
});

it('lets the scatter stress example pick its point count', async () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('example-scatter-stress'));

  expect(screen.getByTestId('plot-stats').textContent).toContain(
    '100,000 points'
  );
  fireEvent.change(screen.getByTestId('stress-point-count'), {
    target: { value: '10000' },
  });
  fireEvent.change(screen.getByTestId('stress-refresh'), {
    target: { value: '1' },
  });
  expect(screen.getByTestId('plot-stats').textContent).toContain(
    '10,000 points · 10,000 replaced per frame'
  );
  await waitFor(() =>
    expect(screen.getByTestId('plot-fps').textContent).toMatch(/fps$/)
  );
  fireEvent.click(screen.getByTestId('toggle-streaming'));
});
