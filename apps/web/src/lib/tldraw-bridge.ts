import { Editor } from 'tldraw';

export class TldrawBridge {
    private editor: Editor | null = null;

    setEditor(editor: Editor | null) {
        this.editor = editor;
    }

    selectTool(toolId: string) {
        if (!this.editor) return;
        this.editor.setCurrentTool(toolId);
    }

    focus() {
        if (!this.editor) return;
        this.editor.getContainer().focus();
    }

    isReady() {
        return !!this.editor;
    }

    getEditor() {
        return this.editor;
    }
}

export const tldrawBridge = new TldrawBridge();
