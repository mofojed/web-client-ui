import { FileStorageItem } from './FileStorage';
import FileExistsError from './FileExistsError';

it('creates the error correct', () => {
  const file: FileStorageItem = {
    type: 'file',
    basename: 'basename',
    filename: '/dir/basename',
    id: '/dir/basename',
  };
  const error = new FileExistsError(file);
  expect(error.info).toBe(file);
  expect(error.isExistingFile).toBe(true);
  expect(error.isInvalid).toBe(true);
  expect(error.message).toEqual('Name already exists');
});
