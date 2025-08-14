declare global {
	interface Map<K, V> {
		map<K2, V2>(mapper: (key: K, value: V) => [K2, V2]): Map<K2, V2>;
		mapValues<V2>(mapper: (value: V, key: K, index: number) => V2): Map<K, V2>;
	}
}

Map.prototype.map = function <K, V, K2, V2>(this: Map<K, V>, mapper: (key: K, value: V) => [K2, V2]): Map<K2, V2> {
	return new Map<K2, V2>(Array.from(this.entries(), ([key, value]) => mapper(key, value)));
};

Map.prototype.mapValues = function <K, V, V2>(
	this: Map<K, V>,
	mapper: (value: V, key: K, index: number) => V2,
): Map<K, V2> {
	const entries = Array.from(this.entries()).map(
		([key, value], index) => [key, mapper(value, key, index)] as [K, V2],
	);

	return new Map<K, V2>(entries);
};

export {};
