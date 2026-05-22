import Svg, { Path, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {
    size?: number,
    color?: string
}

export const Vector = ({ size = 42, color = "#fff", ...props }: IProps) => {
    return (
        <Svg width={size} height={size} fill="none" viewBox="0 0 40 41" {...props}>
            <Path
                fill={color}
                d="M37.78.617c-.86-.16-20.94-3.5-31.64 7.2-1.42 1.42-2.66 3.08-3.7 4.94-3.98 7.14-3.02 15.38 2.36 21.26 3.56-8.88 10.52-16.04 19.2-20-7.72 5.46-13.42 14.4-14.42 23.78a17.6 17.6 0 0 0 8.52 2.22c2.96 0 6.22-.8 9.16-2.44 1.86-1.04 3.52-2.28 4.94-3.7 10.7-10.7 7.34-30.78 7.2-31.64a1.98 1.98 0 0 0-1.62-1.62"
            />
        </Svg>
    );
};
