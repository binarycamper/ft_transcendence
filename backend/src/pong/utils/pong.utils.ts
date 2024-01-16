type Obj = Record<string, unknown>;
export function compareStuctureOfJSONs(objA: Obj, objB: Obj): boolean {
	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);
	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;

		if (typeof objA[key] !== typeof objB[key]) return false;

		if (typeof objA[key] === typeof {})
			if (!compareStuctureOfJSONs(objA[key] as Obj, objB[key] as Obj)) return false;
	}

	return true;
}
