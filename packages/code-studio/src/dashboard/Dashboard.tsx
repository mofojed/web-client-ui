import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

export type DashboardProps = {
  id?: string;
  children?: React.ReactNode | React.ReactNode[];
  onDataChange?: () => void;
  onLayoutConfigChange?: () => void;
  onGoldenLayoutChange?: () => void;
};

export const Dashboard = ({
  id = 'default',
  children,
  onDataChange = () => undefined,
  onLayoutConfigChange = () => undefined,
  onGoldenLayoutChange = () => undefined,
}: DashboardProps): JSX.Element => {
  const layoutElement = useRef(null);
  const [layout, setLayout] = useState(null);

  return (
    <div className="dashboard-container w-100 h-100">
      <div className="w-100 h-100" ref={layoutElement} />
    </div>
  );
};

export default Dashboard;
