/**
 * Exact shortest round-trip ordering for a tiny number of stops.
 *
 * A real basket visits at most a handful of stores (maxStores defaults to 3), so the route is
 * origin -> {≤3 stores in some order} -> origin: at most 3! = 6 permutations. We enumerate them
 * exactly. No heuristics needed at this scale; swap for OSRM's trip service if maxStores grows.
 */

/** All permutations of the index array [0..n-1]. */
function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const perm of permutations(rest)) {
      result.push([items[i]!, ...perm]);
    }
  }
  return result;
}

/**
 * Given a `cost(a, b)` function over node indices where index 0 is the origin and indices
 * 1..n are the stores to visit, return the visiting order of the STORE indices that minimizes
 * the closed tour origin -> stores -> origin. Returns the store indices in visit order.
 */
export function bestRoundTripOrder(
  storeIndices: number[],
  cost: (a: number, b: number) => number,
): number[] {
  if (storeIndices.length <= 1) return storeIndices.slice();

  let best: number[] = storeIndices.slice();
  let bestCost = Infinity;
  const ORIGIN = 0;

  for (const order of permutations(storeIndices)) {
    let total = cost(ORIGIN, order[0]!);
    for (let i = 1; i < order.length; i++) {
      total += cost(order[i - 1]!, order[i]!);
    }
    total += cost(order[order.length - 1]!, ORIGIN);
    if (total < bestCost) {
      bestCost = total;
      best = order;
    }
  }
  return best;
}
