export function swapVisibleItems(allIds: string[], visibleIds: string[], firstId: string, secondId: string): string[] {
  const first = visibleIds.indexOf(firstId)
  const second = visibleIds.indexOf(secondId)
  if (first < 0 || second < 0 || first === second) return allIds

  const reordered = visibleIds.slice()
  const firstItem = reordered[first]
  reordered[first] = reordered[second]
  reordered[second] = firstItem
  const visible = new Set(visibleIds)
  let index = 0
  return allIds.map((id) => visible.has(id) ? reordered[index++] : id)
}
