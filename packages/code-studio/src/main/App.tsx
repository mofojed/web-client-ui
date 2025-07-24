import React, { useEffect, type ReactElement } from 'react';
import { ToastContainer } from '@deephaven/components';
import AppMainContainer from './AppMainContainer';

function App(): ReactElement {
  // Just show it opening a portal at startup, as if user was reloading their dashboard session
  // You do get asked for popup permissions, users should allow
  // useEffect(() => {
  //   window.open(
  //     `http://localhost:4000/?popoutId=xxx`,
  //     '_blank',
  //     'left=2500,top=100,width=800,height=300,popup=true'
  //   );
  // }, []);
  return (
    <div className="app">
      <AppMainContainer />
      <ToastContainer />
    </div>
  );
}

export default App;
