import { Line } from '../utils/intersection';
import { PongGameSettings } from './PongGame';

export class Wall {
	constructor(settings: PongGameSettings) {
		/* normalize */
		const aspectRatio = settings.aspectRatio.x / settings.aspectRatio.y;
		const wallHeight = settings.wallHeight * aspectRatio;
		const BOUNDARY = 20;

		this.upper = {
			get limit(): number {
				return wallHeight;
			},
			get line(): Line {
				return {
					a: { x: 0 - BOUNDARY, y: wallHeight },
					b: { x: 100 + BOUNDARY, y: wallHeight },
				};
			},
		};

		this.lower = {
			get limit(): number {
				return 100 - wallHeight;
			},
			get line(): Line {
				return {
					a: { x: 0 - BOUNDARY, y: 100 - wallHeight },
					b: { x: 100 + BOUNDARY, y: 100 - wallHeight },
				};
			},
		};
	}

	upper: { limit: number; line: Line };
	lower: { limit: number; line: Line };
}
