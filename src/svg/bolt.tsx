import Svg, { Path, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {
    size?: number,
    color?: string
}

export const Vector = ({ size = 44, color = "#fff", ...props }: IProps) => {
    return (
        <Svg width={size} height={size} fill="none" viewBox="0 0 22 36" {...props}>
            <Path
                fill={color}
                d="M21.55 15.275a1.332 1.332 0 0 0-1.228-1.849h-8.163a1.33 1.33 0 0 1-1.332-1.331V1.333c0-1.453-1.995-1.855-2.559-.516L.106 20.203a1.332 1.332 0 0 0 1.227 1.848h8.163c.735 0 1.331.597 1.331 1.332v10.761c0 1.453 1.996 1.856 2.56.517z"
            />
        </Svg>
    );
};
