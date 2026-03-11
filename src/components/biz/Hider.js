import React from 'react';

const Hider = ({ show, children }) => {
  const count = React.Children.count(children);
  if (count === 1) {
    return <>{show && <>{children}</>}</>;
  } else if (count === 2) {
    return <>{show ? <>{children[0]}</> : <>{children[1]}</>}</>;
  } else {
    return <>{children}</>;
  }
};

export default Hider;
