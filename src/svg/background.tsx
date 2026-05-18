// @ts-nocheck
import Svg, {
    Path,
    Stop,
    LinearGradient,
    Defs,
    type SvgProps,
} from "react-native-svg";

interface IProps extends SvgProps {
    size?: number;
    color?: string;
 }

export const BackgroundRectagle = (props: IProps) => {
    const { size = 333, color = "#367C00", ...restProps } = props;

    return (
        <Svg width={size} height={size * (339 / 333)} fill="none" viewBox="0 0 333 339" {...restProps}>
            <Path
                fill="url(#a)"
                d="M0 304c0 19.33 15.67 35 35 35h253c12.703 0 23-10.297 23-23V94.5c0-12.15 9.85-22 22-22V0h-45.5c-12.703 0-23 10.298-23 23v223c0 12.703-10.297 23-23 23H35c-19.33 0-35 15.67-35 35"
            />
            <Defs>
                <LinearGradient
                    id="a"
                    x1="142.5"
                    x2="252.5"
                    y1="278.5"
                    y2="69.5"
                    gradientUnits="userSpaceOnUse"
                >
                    <Stop stopColor={color} />
                    <Stop offset="1" stopColor="#fff" />
                </LinearGradient>
            </Defs>
        </Svg>
    );
};
