import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState } from "@codemirror/state";
import { vim } from "@replit/codemirror-vim";
import {
  type Component,
  createEffect,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";

export interface CodeMirrorEditorProps {
  value?: string;
  onInput?: (value: string) => void;
  onTouch?: () => void;
  class?: string;
  placeholder?: string;
  vim?: boolean;
}

const CodeMirrorEditor: Component<CodeMirrorEditorProps> = (rawProps) => {
  const props = mergeProps(
    { value: "", placeholder: "", vim: false },
    rawProps,
  );
  let containerRef!: HTMLDivElement;
  let view: EditorView | undefined;
  const vimCompartment = new Compartment();

  // Track whether the update came from us to avoid feedback loops
  let updating = false;

  const daisyTheme = EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "14px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    },
    ".cm-content": {
      caretColor: "var(--color-base-content)",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--color-base-content)",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor:
        "color-mix(in oklch, var(--color-primary) 30%, transparent)",
    },
    ".cm-selectionBackground": {
      backgroundColor:
        "color-mix(in oklch, var(--color-primary) 20%, transparent)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-base-200)",
      color: "color-mix(in oklch, var(--color-base-content) 40%, transparent)",
      borderRight:
        "1px solid color-mix(in oklch, var(--color-base-content) 10%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor:
        "color-mix(in oklch, var(--color-base-content) 8%, transparent)",
    },
    ".cm-activeLine": {
      backgroundColor:
        "color-mix(in oklch, var(--color-base-content) 5%, transparent)",
    },
  });

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !updating) {
        props.onInput?.(update.state.doc.toString());
      }
    });

    view = new EditorView({
      state: EditorState.create({
        doc: props.value,
        extensions: [
          vimCompartment.of(props.vim ? vim() : []),
          basicSetup,
          markdown({ codeLanguages: languages }),
          daisyTheme,
          updateListener,
          EditorView.lineWrapping,
        ],
      }),
      parent: containerRef,
    });

    createEffect(() => {
      view?.dispatch({
        effects: vimCompartment.reconfigure(props.vim ? vim() : []),
      });
    });

    const onTouchStart = () => props.onTouch?.();
    containerRef.addEventListener("touchstart", onTouchStart, { once: true });

    onCleanup(() => {
      containerRef.removeEventListener("touchstart", onTouchStart);
      view?.destroy();
      view = undefined;
    });
  });

  return <div ref={containerRef} class={props.class} />;
};

export default CodeMirrorEditor;
