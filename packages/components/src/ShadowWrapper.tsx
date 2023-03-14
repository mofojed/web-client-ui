import React, { useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

export type ShadowWrapperProps = {
  children?: React.ReactNode;
};

export function ShadowWrapper({ children }: ShadowWrapperProps) {
  const element = useRef<HTMLSpanElement>(null);
  const [wrapper, setWrapper] = useState<HTMLSpanElement>();

  useLayoutEffect(
    function initShadowRoot() {
      const shadow = element.current?.attachShadow({ mode: 'open' });
      const newWrapper = document.createElement('span');
      newWrapper.setAttribute('class', 'shadow-wrapper');
      shadow?.appendChild(newWrapper);
      setWrapper(newWrapper);
    },
    [element]
  );

  return (
    <span className="shadow-root" ref={element}>
      {wrapper ? ReactDOM.createPortal(children, wrapper) : null}
    </span>
  );
}

export default ShadowWrapper;
