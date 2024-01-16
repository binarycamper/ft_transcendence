export interface Point {
	x: number;
	y: number;
}
export interface Line {
	a: Point;
	b: Point;
}

export default function findIntersection(line1: Line, line2: Line) {
	/* Calculate the direction vectors of the lines */
	const dir1: Point = { x: line1.b.x - line1.a.x, y: line1.b.y - line1.a.y };
	const dir2: Point = { x: line2.b.x - line2.a.x, y: line2.b.y - line2.a.y };

	/* Calculate the cross products of the lines and their directions */
	const crossProduct1 = crossProduct(dir2, line1.a, line2.a);
	const crossProduct2 = crossProduct(dir2, line1.b, line2.a);
	const crossProduct3 = crossProduct(dir1, line2.a, line1.a);
	const crossProduct4 = crossProduct(dir1, line2.b, line1.a);

	/* Check if the lines intersect */
	if (!(crossProduct1 * crossProduct2 <= 0 && crossProduct3 * crossProduct4 <= 0)) {
		return null; /* Lines do not intersect */
	}

	const denominator =
		(line1.a.x - line1.b.x) * (line2.a.y - line2.b.y) -
		(line1.a.y - line1.b.y) * (line2.a.x - line2.b.x);
	if (denominator === 0) return null; /* Lines are parallel, and thus do not intersect */

	const intxn: Point = {
		x:
			((line1.a.x * line1.b.y - line1.a.y * line1.b.x) * (line2.a.x - line2.b.x) -
				(line1.a.x - line1.b.x) * (line2.a.x * line2.b.y - line2.a.y * line2.b.x)) /
			denominator,
		y:
			((line1.a.x * line1.b.y - line1.a.y * line1.b.x) * (line2.a.y - line2.b.y) -
				(line1.a.y - line1.b.y) * (line2.a.x * line2.b.y - line2.a.y * line2.b.x)) /
			denominator,
	};

	return {
		x: intxn.x,
		y: intxn.y,
	};
}

function crossProduct(vector: Point, point1: Point, point2: Point) {
	return vector.x * (point2.y - point1.y) - vector.y * (point2.x - point1.x);
}
