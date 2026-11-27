import arrow from './arrow.svg';

import React from 'react';

export const SvgArrow = ({ opacity = 1 }) => {
  return <img src={arrow} alt="arrow icon" style={{ opacity: opacity, width: '20px', height: '20px' }} />;
};
