/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { LayoutContextValue } from './types';

const LayoutContext = createContext<LayoutContextValue | null>(null);

export default LayoutContext;

export function useLayoutContext(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (ctx == null) {
    throw new Error('Layout components must be rendered inside a <Dashboard>.');
  }
  return ctx;
}
