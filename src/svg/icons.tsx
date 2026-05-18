// @ts-nocheck
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {
    size?: number;
    color?: string;
}

export const UserIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const BriefcaseIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const StarIcon = ({ size = 24, color = "#000", filled = false, ...props }: IProps & { filled?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} {...props}>
        <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const MapPinIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const PhoneIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const ChevronRightIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const ShieldIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const CameraIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const SearchIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const BellIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const SettingsIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const HomeIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const CheckCircleIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="22 4 12 14.01 9 11.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const UploadIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="17 8 12 3 7 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="3" x2="12" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const EditIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const LogOutIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const WrenchIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const UsersIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const InfoIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const LockIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const HelpCircleIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const ClockIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const ZapIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const DropletIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const WindIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const CheckIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const PlusIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const ArrowRightIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Polyline points="12 5 19 12 12 19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const FilterIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const XIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

export const CrosshairIcon = ({ size = 24, color = "#000", ...props }: IProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="22" y1="12" x2="18" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="6" y1="12" x2="2" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="6" x2="12" y2="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="22" x2="12" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
