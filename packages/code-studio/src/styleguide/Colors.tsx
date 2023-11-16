/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import classNames from 'classnames';
import { sampleSectionIdAndClasses } from './utils';

function Colors(): React.ReactElement {
  const graySwatches = [
    ['100', '900'],
    ['200', '800'],
    ['300', '700'],
    ['400', '600'],
    ['500', '500'],
    ['600', '500'],
    ['700', '400'],
    ['800', '300'],
    ['850', '200'],
    ['8XX', '100'],
    ['900', '75'],
  ].map(([swatch, dh]) => (
    <div
      className={classNames('swatch', 'gray-swatch', `gray-swatch-${swatch}`)}
      key={swatch}
    >
      <span>
        Gray-
        {swatch}
      </span>
      <span style={{ backgroundColor: `var(--dh-color-gray-${dh})` }}>
        --dh-gray-{dh}
      </span>
    </div>
  ));

  const colorSwatches = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'white',
    'black',
    'content-bg',
    'primary',
    'primary-dark',
    'background',
    'foreground',
  ].map(swatch => (
    <div key={swatch} className={classNames('swatch', `swatch-${swatch}`)}>
      {swatch}
    </div>
  ));

  return (
    <div {...sampleSectionIdAndClasses('colors')}>
      <h2 className="ui-title">Colors</h2>
      <div className="row">
        <div className="col">{graySwatches}</div>

        <div className="col">{colorSwatches}</div>

        <div className="col">
          <p>
            Gray Range is available for background/tab colors, and should cover
            the full range used in mockups. Always use the semantic color names
            in your .scss files when applicable for UI elements.
          </p>
          <p>
            For refrence key colors are $primary for interactable elements,
            content-bg as background. White is same as gray-200. Gray-100 is
            used when white needs an active color. content-bg is between 800 and
            900.
          </p>
          <pre>
            {`
// as semantic colours
$primary: $interfaceblue;
$secondary: $gray-600;
$content-bg: $interfacegray;
$foreground: $interfacewhite;
$background: $interfaceblack;
$success: $green;
$info: $yellow;
$warning: $orange;
$danger: $red;
`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Colors;
