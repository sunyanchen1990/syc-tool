export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonTreeNode {
  path: string;
  keyLabel: string;
  value: unknown;
  valueType: JsonValueType;
  children?: JsonTreeNode[];
}

export function getValueType(value: unknown): JsonValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

export function buildJsonTree(
  value: unknown,
  path = 'root',
  keyLabel = ''
): JsonTreeNode {
  const valueType = getValueType(value);
  const node: JsonTreeNode = { path, keyLabel, value, valueType };

  if (valueType === 'object' && value !== null && !Array.isArray(value)) {
    node.children = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      buildJsonTree(v, `${path}.${k}`, k)
    );
  } else if (valueType === 'array') {
    node.children = (value as unknown[]).map((v, i) =>
      buildJsonTree(v, `${path}[${i}]`, `[${i}]`)
    );
  }

  return node;
}

export function collectExpandablePaths(node: JsonTreeNode): string[] {
  if (node.valueType !== 'object' && node.valueType !== 'array') return [];
  const paths = [node.path];
  for (const child of node.children ?? []) {
    paths.push(...collectExpandablePaths(child));
  }
  return paths;
}

export function defaultExpandedPaths(node: JsonTreeNode, maxDepth = 2, depth = 0): Set<string> {
  const set = new Set<string>();
  if (node.valueType === 'object' || node.valueType === 'array') {
    if (depth < maxDepth) {
      set.add(node.path);
      for (const child of node.children ?? []) {
        defaultExpandedPaths(child, maxDepth, depth + 1).forEach((p) => set.add(p));
      }
    }
  }
  return set;
}

export function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

export function collapsedPreview(node: JsonTreeNode): string {
  if (node.valueType === 'object') {
    const n = node.children?.length ?? 0;
    return `{ ${n} 个属性 }`;
  }
  if (node.valueType === 'array') {
    const n = node.children?.length ?? 0;
    return `[ ${n} 项 ]`;
  }
  return formatPrimitive(node.value);
}

export function isExpandable(node: JsonTreeNode): boolean {
  return node.valueType === 'object' || node.valueType === 'array';
}
