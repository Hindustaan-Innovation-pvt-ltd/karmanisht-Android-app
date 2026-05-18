// @ts-nocheck
import Svg, { Path, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {
    size?: number;
    color?: string;
}

export const LocationIcon = (props: IProps) => {
    return (
        <Svg width={props.size || 16} height={props.size || 21} fill="none" viewBox="0 0 16 21" {...props}>
            <Path
                fill={props.color || "#fff"}
                d="M8 0C3.59 0 0 3.59 0 8c-.03 6.44 7.12 11.6 7.42 11.82.17.12.38.19.58.19s.41-.06.58-.19C8.88 19.6 16.03 14.45 16 8c0-4.41-3.59-8-8-8m0 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4"
            />
        </Svg>
    );
};


export const LocationBrokenIcon = (props: IProps) => {
    return (
        <Svg width={props.size || 16} height={props.size || 21} fill="none" viewBox="0 0 100 114" {...props}>
            <Path
                fill={props.color || "#000000"}
                d="M46.125 0q1.284 0 2.563.071L44.25 11.875l4.438 17.792a16.65 16.65 0 0 0-14.34 4.68 16.655 16.655 0 0 0 14.34 28.236l3.062 7.792-1.5 4.5 3 1.5 3.125 13.313-7.687 22.377q-1.272.905-2.563 1.782c-3.316-2.286-6.554-4.628-9.66-7.191a143 143 0 0 1-14.622-13.832C11.367 81.364 0 64.764 0 46.125A46.126 46.126 0 0 1 46.125 0m10.25 0a46.126 46.126 0 0 1 43.563 46.054c0 18.64-11.368 35.245-21.843 46.699a143.5 143.5 0 0 1-14.622 13.832 138 138 0 0 1-7.098 5.409L61.5 88.932l-2.25-13.057-4.5-2 3.5-5-1.875-6.363a16.656 16.656 0 0 0 0-32.916L48.25 13.438z"
            />
        </Svg>
    );
};
