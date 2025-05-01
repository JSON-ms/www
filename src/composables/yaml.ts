import { LineCounter, parseDocument, YAMLMap, YAMLSeq } from "yaml";

export type PathValue = {
  path: string;
  value: any;
};

export type FoundCallback = (value: any, line: number, col: number, path: string) => any | void;

export function parseYamlAndFindPaths(
  yamlContent: string,
  paths: PathValue[],
  onFound: FoundCallback,
  update: boolean = false
): string {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yamlContent, { lineCounter });

  function traverse(node: any, currentPath: string = '', createPath: boolean = false): any {
    if (!node || typeof node !== 'object') return node;

    const pathParts = currentPath.split('.');
    const lastPart = pathParts.pop();
    let currentNode = node;

    if (pathParts.length > 0) {
      // Traverse down to the parent node
      pathParts.forEach(part => {
        if (currentNode instanceof YAMLMap) {
          const existingPair = currentNode.items.find((item: any) => item.key.value === part);
          if (existingPair) {
            currentNode = existingPair.value;
          } else if (createPath) {
            const newMap = new YAMLMap();
            currentNode.set(part, newMap);
            currentNode = newMap;
          }
        } else if (currentNode instanceof YAMLSeq) {
          const index = parseInt(part, 10);
          const existingItem = currentNode.items[index];
          if (existingItem) {
            currentNode = existingItem;
          } else if (createPath) {
            const newSeq = new YAMLSeq();
            currentNode.items[index] = newSeq;
            currentNode = newSeq;
          }
        }
      });
    }

    // Now we are at the last part of the path
    if (currentNode instanceof YAMLMap) {
      const existingPair = currentNode.items.find((item: any) => item.key.value === lastPart);
      if (existingPair && update) {
        const pos = lineCounter?.linePos(existingPair.value.range?.[0] ?? 0);
        if (pos) {
          const match = paths.find(pv => pv.path === currentPath);
          if (match) {
            const newValue = onFound(match.value, pos.line, pos.col, currentPath);
            if (newValue !== undefined) {
              existingPair.value = doc.createNode(newValue);
            }
          }
        }
      } else if (createPath) {
        const newNode = doc.createNode(paths.find(pv => pv.path === currentPath)?.value ?? null);
        currentNode.set(lastPart, newNode);
      }
    } else if (currentNode instanceof YAMLSeq) {
      const index = Number(lastPart); // Convert lastPart to a number
      if (!isNaN(index) && currentNode.items[index] == null && createPath) {
        const newNode = doc.createNode(paths.find(pv => pv.path === currentPath)?.value ?? null);
        currentNode.items[index] = newNode;
      }
    }

    return currentNode;
  }

  paths.forEach(pathValue => {
    const pathParts = pathValue.path.split('.');
    const firstPart = pathParts.shift();
    const currentNode = doc.contents;

    if (firstPart) {
      traverse(currentNode, firstPart, true);
    }

    // Find or create path and update value
    traverse(currentNode, pathValue.path, true);
  });

  return doc.toString({
    indent: 2,
    lineWidth: 0, // disable wrapping
    defaultStringType: 'PLAIN',
  });
}
