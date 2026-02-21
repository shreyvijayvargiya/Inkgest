import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";

const FPS = 30;
const DEFAULT_PER_SLIDE = 5;
const TITLE_DURATION_S = 2.5;

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			id="VideoComposition"
			component={VideoComposition}
			durationInFrames={300}
			fps={FPS}
			width={1280}
			height={720}
			defaultProps={{
				images: [],
				title: "Demo",
				audioUrl: "",
				perSlide: DEFAULT_PER_SLIDE,
			}}
			calculateMetadata={({ props }) => {
				const slides = (props.images ?? []).length || 1;
				const perSlide = props.perSlide ?? DEFAULT_PER_SLIDE;
				const totalSeconds = TITLE_DURATION_S + slides * perSlide;
				return { durationInFrames: Math.ceil(totalSeconds * FPS) };
			}}
		/>
	);
};
