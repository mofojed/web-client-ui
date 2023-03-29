import React from 'react';
import { useNavigate } from 'react-router-dom';

function withRouter(Component: any) {
  function Wrapper(props: any) {
    const navigate = useNavigate();

    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Component navigate={navigate} {...props} />;
  }

  return Wrapper;
}

export default withRouter;
