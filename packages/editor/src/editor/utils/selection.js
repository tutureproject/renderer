import { findChildrenByType, findParentNodeOfType } from 'prosemirror-utils';

export const getAncestorNodeTypeName = ($pos) => {
  let nodeTypeNameArr = [];
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);

    nodeTypeNameArr.push(node.type.name);
  }

  return nodeTypeNameArr;
};

export const getChildrenOfType = (view, parentStrArr, childStr) => {
  console.log('view', view);
  const { schema, selection } = view;

  const parentNode = parentStrArr.map((str) => {
    const node = findParentNodeOfType(schema.nodes[str])(selection);

    console.log('node', node);
  });

  console.log('parentNode', schema.nodes[parentStrArr[0]]);

  const childNode = parentNode.map((node) =>
    findChildrenByType(node, schema.nodes[childStr]),
  );

  return childNode;
};

export const getChildrenLength = (view, parentStrArr, childStr) => {
  const childNode = getChildrenOfType(view, parentStrArr, childStr) || [];

  return childNode.length;
};
