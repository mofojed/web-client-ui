import { render, screen } from '@testing-library/react';
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
