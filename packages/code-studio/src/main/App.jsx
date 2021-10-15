import React from 'react';
import PropTypes from 'prop-types';
import { ContextMenuRoot } from '@deephaven/components';
import AppMainContainer from './AppMainContainer';

const App = ({ plugins }) => (
  <div className="app">
    <AppMainContainer plugins={plugins} />
    <ContextMenuRoot />
  </div>
);

App.propTypes = { plugins: PropTypes.arrayOf(PropTypes.any) };
App.defaultProps = { plugins: [] };

export default App;
