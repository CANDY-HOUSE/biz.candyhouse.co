import React from 'react';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import FingerprintOutlinedIcon from '@mui/icons-material/FingerprintOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';

const SvgIcon = ({ children, size = 24, viewBox = '0 0 24 24', sx = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        flexShrink: 0,
        ...sx,
      }}
    >
      {children}
    </svg>
  );
};

export const SesameNavIcon = ({ size = 24, sx = {} }) => {
  return (
    <SvgIcon size={size} viewBox="0 0 18 20" sx={sx}>
      <path
        d="M5.7889,5.7889m-2.8175,2.1309a3.5326,3.5326 97.8991,1 1,5.635 -4.2618a3.5326,3.5326 97.8991,1 1,-5.635 4.2618"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
      <path d="M8.1966,8.9723L14.6514,17.4845" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M9.7374,16.3663L12.2002,14.4846" stroke="currentColor" strokeWidth="4.4" fill="none" />
    </SvgIcon>
  );
};

export const VisionNavIcon = ({ size = 24, sx = {} }) => {
  return (
    <SvgIcon size={size} sx={sx}>
      <path
        fill="currentColor"
        d="M12,20.2c-0.1,0-0.3-0.1-0.4-0.2l-3.1-3.1L8.3,17c-0.5,0.1-0.9,0.2-1.3,0.2c-3.1,0-5.7-2.5-5.7-5.7c0-0.7,0.2-1.4,0.5-2.3C1.9,9,2.1,8.9,2.3,8.9c0.1,0,0.2,0,0.3,0C2.9,9.1,3,9.4,2.9,9.7c-0.2,0.6-0.3,1.1-0.3,1.8c0,2.4,2,4.4,4.4,4.4s4.4-2,4.4-4.4S9.4,7.1,7,7.1S2.4,6.4,0.6,5l0,0l0,0C0.4,4.8,0.3,4.7,0.3,4.6c0-0.2,0-0.4,0.1-0.5l0,0l0,0c0.1-0.2,0.3-0.2,0.4-0.2s0.3,0,0.4,0.1C2.8,5.2,4.8,5.8,7,5.8c1.9,0,3.6,0.9,4.7,2.6L12,8.9l0.3-0.5c1.1-1.6,2.8-2.6,4.7-2.6c2.2,0,4.1-0.7,5.7-1.9c0.1-0.1,0.2-0.1,0.3-0.1c0.2,0,0.4,0.1,0.5,0.2c0.1,0.1,0.1,0.3,0.1,0.5c0,0.2-0.1,0.3-0.2,0.4C21.6,6.3,19.4,7,17,7s-4.4,2-4.4,4.4s2,4.4,4.4,4.4s4.4-2,4.4-4.4c0-0.6-0.1-1.2-0.3-1.8c-0.1-0.3,0-0.7,0.3-0.8c0.1,0,0.2,0,0.3,0c0.2,0,0.5,0.1,0.5,0.3c0.3,0.9,0.5,1.6,0.5,2.3c0,3.1-2.5,5.7-5.7,5.7c-0.4,0-0.8-0.1-1.3-0.2l-0.2-0.1l-3,3.2C12.3,20.2,12.2,20.2,12,20.2zM11.7,14.7c-0.4,0.6-0.9,1.1-1.5,1.5l-0.4,0.3l2.2,2.2l2.2-2.2l-0.4-0.3c-0.6-0.4-1.1-0.9-1.5-1.5L12,14.2L11.7,14.7z"
      />
      <path
        fill="currentColor"
        d="M7,9.6c-1,0-1.9,0.8-1.9,1.9s0.8,1.9,1.9,1.9s1.9-0.8,1.9-1.9S8,9.6,7,9.6zM7.5,11.4c-0.3,0-0.6-0.3-0.6-0.6s0.3-0.6,0.6-0.6s0.6,0.3,0.6,0.6S7.8,11.4,7.5,11.4z"
      />
      <path
        fill="currentColor"
        d="M17.1,9.6c-1,0-1.9,0.8-1.9,1.9s0.8,1.9,1.9,1.9s1.9-0.8,1.9-1.9S18.1,9.6,17.1,9.6zM16.6,11.4c-0.3,0-0.6-0.3-0.6-0.6s0.3-0.6,0.6-0.6c0.3,0,0.6,0.3,0.6,0.6S16.9,11.4,16.6,11.4z"
      />
    </SvgIcon>
  );
};

export const ContactsNavIcon = ({ size = 24, sx = {} }) => {
  return (
    <SvgIcon size={size} sx={sx}>
      <path
        d="M18.8,19.8L18.8,19.3155C18.8,19.0861 18.5647,18.71 18.3598,18.6101L12.6995,15.849C11.1729,15.1044 10.7956,13.3029 11.8893,12.0064L12.2509,11.5778C12.8022,10.9243 13.3,9.5644 13.3,8.7102L13.3,7.0002C13.3,5.4549 12.0456,4.2 10.5,4.2C8.9563,4.2 7.7,5.4552 7.7,6.9996L7.7,8.7093C7.7,9.5657 8.1957,10.9205 8.7491,11.5763L9.1106,12.0048C10.2066,13.3039 9.8252,15.1037 8.3007,15.8476L2.6404,18.6098C2.437,18.709 2.2,19.0887 2.2,19.3155L2.2,19.8L18.8,19.8ZM1,20L1,19.3155C1,18.6304 1.4982,17.8319 2.1141,17.5313L7.7745,14.7691C8.5954,14.3685 8.7863,13.4813 8.1934,12.7786L7.8319,12.3501C7.0963,11.4783 6.5,9.8495 6.5,8.7093L6.5,6.9996C6.5,4.7907 8.2954,3 10.5,3C12.7091,3 14.5,4.793 14.5,7.0002L14.5,8.7102C14.5,9.8493 13.9009,11.4829 13.1681,12.3516L12.8066,12.7801C12.217,13.479 12.4012,14.3684 13.2255,14.7705L18.8859,17.5316C19.5012,17.8317 20,18.6252 20,19.3155L20,20C20,20.5523 19.5523,21 19,21L2,21C1.4477,21 1,20.5523 1,20ZM20,14.5L23,14.5L23,15.7L20,15.7L20,14.5ZM18,11.5L23,11.5L23,12.7L18,12.7L18,11.5ZM16,8.5L23,8.5L23,9.7L16,9.7L16,8.5Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
};

export const MeNavIcon = ({ size = 24, sx = {} }) => {
  return (
    <SvgIcon size={size} sx={sx}>
      <path
        d="M20.3,19.8L20.3,19.3155C20.3,19.0861 20.0647,18.71 19.8598,18.6101L14.1995,15.849C12.6729,15.1044 12.2956,13.3029 13.3893,12.0064L13.7509,11.5778C14.3022,10.9243 14.8,9.5644 14.8,8.7102L14.8,7.0002C14.8,5.4549 13.5456,4.2 12,4.2C10.4563,4.2 9.2,5.4552 9.2,6.9996L9.2,8.7093C9.2,9.5657 9.6957,10.9205 10.2491,11.5763L10.6106,12.0048C11.7066,13.3039 11.3252,15.1037 9.8007,15.8476L4.1404,18.6098C3.937,18.709 3.7,19.0887 3.7,19.3155L3.7,19.8L20.3,19.8ZM2.5,20L2.5,19.3155C2.5,18.6304 2.9982,17.8319 3.6141,17.5313L9.2745,14.7691C10.0954,14.3685 10.2863,13.4813 9.6934,12.7786L9.3319,12.3501C8.5963,11.4783 8,9.8495 8,8.7093L8,6.9996C8,4.7907 9.7954,3 12,3C14.2091,3 16,4.793 16,7.0002L16,8.7102C16,9.8493 15.4009,11.4829 14.6681,12.3516L14.3066,12.7801C13.717,13.479 13.9012,14.3684 14.7255,14.7705L20.3859,17.5316C21.0012,17.8317 21.5,18.6252 21.5,19.3155L21.5,20C21.5,20.5523 21.0523,21 20.5,21L3.5,21C2.9477,21 2.5,20.5523 2.5,20Z"
        fill="currentColor"
      />
    </SvgIcon>
  );
};

export const navIconMap = {
  home: HomeOutlinedIcon,
  sesame: SesameNavIcon,
  vision: VisionNavIcon,
  contacts: ContactsNavIcon,
  me: MeNavIcon,
  members: GroupsOutlinedIcon,
  ssmDevices: MeetingRoomOutlinedIcon,
  touchDevices: FingerprintOutlinedIcon,
  cards: CreditCardOutlinedIcon,
  history: HistoryOutlinedIcon,
  schedule: EventNoteOutlinedIcon,
};
