import { setBlockType } from "prosemirror-commands";
import type { NodeType } from "prosemirror-model";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import { type Plan, serialize } from "./model";

export function prepareTransaction(
  plan: Plan,
  state: EditorState,
  transaction: Transaction,
) {
  const result = state.applyTransaction(transaction);
  const changed = result.transactions.some((item) => item.docChanged);
  const html = changed ? serialize(plan, result.state.doc) : undefined;
  return { ...result, changed, html };
}

export function preserveBlockType(type: NodeType, level?: number): Command {
  return (state, dispatch) => {
    if (!setBlockType(type, level === undefined ? null : { level })(state))
      return false;
    if (dispatch) {
      const tr = state.tr;
      for (const { $from, $to } of state.selection.ranges) {
        tr.setBlockType($from.pos, $to.pos, type, (node) => ({
          origin:
            typeof node.attrs.origin === "string" ? node.attrs.origin : null,
          ...(level === undefined ? {} : { level }),
          ...(type.name === "code_block"
            ? {
                codeOrigin:
                  typeof node.attrs.codeOrigin === "string"
                    ? node.attrs.codeOrigin
                    : null,
              }
            : {}),
        }));
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}
