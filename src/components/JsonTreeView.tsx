import { useCallback } from 'react';
import type { JsonTreeNode } from '../utils/jsonTree';
import {
  collapsedPreview,
  formatPrimitive,
  isExpandable,
} from '../utils/jsonTree';
import './JsonTreeView.css';

interface JsonTreeViewProps {
  root: JsonTreeNode;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}

function TreeNode({
  node,
  depth,
  isRoot,
  expanded,
  onToggle,
}: {
  node: JsonTreeNode;
  depth: number;
  isRoot?: boolean;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) {
  const expandable = isExpandable(node);
  const isOpen = expanded.has(node.path);

  return (
    <div className="json-tree-node" style={{ '--depth': depth } as React.CSSProperties}>
      <div className="json-tree-row">
        {expandable ? (
          <button
            type="button"
            className="json-tree-toggle"
            onClick={() => onToggle(node.path)}
            aria-expanded={isOpen}
            aria-label={isOpen ? '收起' : '展开'}
          >
            {isOpen ? '−' : '+'}
          </button>
        ) : (
          <span className="json-tree-toggle json-tree-toggle--leaf" />
        )}

        {!isRoot && (
          <span
            className={`json-tree-key${node.keyLabel.startsWith('[') ? ' json-tree-key--index' : ''}`}
          >
            {node.keyLabel}
          </span>
        )}
        {!isRoot && !expandable && <span className="json-tree-colon">: </span>}

        {expandable ? (
          <>
            {!isRoot && <span className="json-tree-colon">: </span>}
            {!isOpen ? (
              <span className="json-tree-preview">{collapsedPreview(node)}</span>
            ) : (
              <span className="json-tree-bracket">
                {node.valueType === 'object' ? '{' : '['}
              </span>
            )}
          </>
        ) : (
          <span className={`json-tree-value json-tree-value--${node.valueType}`}>
            {formatPrimitive(node.value)}
          </span>
        )}
      </div>

      {expandable && isOpen && (
        <div className="json-tree-children">
          {node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
          <div className="json-tree-row json-tree-close">
            <span className="json-tree-toggle json-tree-toggle--leaf" />
            <span className="json-tree-bracket">{node.valueType === 'object' ? '}' : ']'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JsonTreeView({ root, expanded, onToggle }: JsonTreeViewProps) {
  const handleToggle = useCallback(
    (path: string) => onToggle(path),
    [onToggle]
  );

  const showRoot = root.valueType === 'object' || root.valueType === 'array';

  if (!showRoot) {
    return (
      <div className="json-tree-view json-tree-view--primitive">
        <span className={`json-tree-value json-tree-value--${root.valueType}`}>
          {formatPrimitive(root.value)}
        </span>
      </div>
    );
  }

  return (
    <div className="json-tree-view">
      <TreeNode node={root} depth={0} isRoot expanded={expanded} onToggle={handleToggle} />
    </div>
  );
}
