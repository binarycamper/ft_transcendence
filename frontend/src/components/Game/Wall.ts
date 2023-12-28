import { Line } from './intersection';

export type Wall = {
	upper: { limit: number; line: Line };
	lower: { limit: number; line: Line };
};

export default function createWall(wallHeight: number): Wall {
	const BOUNDARY = 20;

	return {
		upper: {
			get limit(): number {
				return wallHeight;
			},
			get line(): Line {
				return {
					start: { x: 0 - BOUNDARY, y: wallHeight },
					end: { x: 100 + BOUNDARY, y: wallHeight },
				};
			},
		},
		lower: {
			get limit(): number {
				return 100 - wallHeight;
			},
			get line(): Line {
				return {
					start: { x: 0 - BOUNDARY, y: 100 - wallHeight },
					end: { x: 100 + BOUNDARY, y: 100 - wallHeight },
				};
			},
		},
	};
}
