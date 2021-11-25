import FileNotFoundError from './FileNotFoundError';

it('creates an error correctly', () => {
  const error = new FileNotFoundError();
  expect(error.isFileNotFound).toBe(true);
});
