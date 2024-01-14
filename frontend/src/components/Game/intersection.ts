//intersection.ts
export type Point = {
	x: number;
	y: number;
};
export type Line = {
	start: Point;
	end: Point;
};

export default function findIntersection(a: Line, b: Line) {
	/* Calculate the direction vectors of the lines */
	const dir1: Point = { x: a.end.x - a.start.x, y: a.end.y - a.start.y };
	const dir2: Point = { x: b.end.x - b.start.x, y: b.end.y - b.start.y };

	/* Calculate the cross products of the lines and their directions */
	const crossProduct1 = crossProduct(dir2, a.start, b.start);
	const crossProduct2 = crossProduct(dir2, a.end, b.start);
	const crossProduct3 = crossProduct(dir1, b.start, a.start);
	const crossProduct4 = crossProduct(dir1, b.end, a.start);

	/* Check if the lines intersect */
	if (!(crossProduct1 * crossProduct2 <= 0 && crossProduct3 * crossProduct4 <= 0)) {
		return null; /* Lines do not intersect */
	}

	const denominator =
		(a.start.x - a.end.x) * (b.start.y - b.end.y) - (a.start.y - a.end.y) * (b.start.x - b.end.x);
	if (denominator === 0) return null; /* Lines are parallel, and thus do not intersect */

	const intxn: Point = {
		x:
			((a.start.x * a.end.y - a.start.y * a.end.x) * (b.start.x - b.end.x) -
				(a.start.x - a.end.x) * (b.start.x * b.end.y - b.start.y * b.end.x)) /
			denominator,
		y:
			((a.start.x * a.end.y - a.start.y * a.end.x) * (b.start.y - b.end.y) -
				(a.start.y - a.end.y) * (b.start.x * b.end.y - b.start.y * b.end.x)) /
			denominator,
	};

	// const distance = Math.sqrt(Math.pow(intxn.x - a.start.x, 2) + Math.pow(intxn.y - a.start.y, 2));

	return {
		// d: distance,
		x: intxn.x,
		y: intxn.y,
	};
}

function crossProduct(vector: Point, point1: Point, point2: Point) {
	return vector.x * (point2.y - point1.y) - vector.y * (point2.x - point1.x);
}
