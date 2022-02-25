import { Component, Event, EventEmitter, Prop, h, Element, Host, Method } from '@stencil/core';

import { Edition, RevoGrid } from '../../interfaces';
import { EDIT_INPUT_WR } from '../../utils/consts';
import { TextEditor } from './editors/text';

@Component({
  tag: 'revogr-edit',
  styleUrl: 'revogr-edit-style.scss',
})
export class RevoEdit {
  @Element() element: HTMLElement;
  @Prop() editCell: Edition.EditCell;

  @Prop() column: RevoGrid.ColumnRegular | null;
  /** Custom editors register */
  @Prop() editor: Edition.EditorCtr | null;

  @Prop() saveOnClose: boolean = false;

  @Event({ bubbles: false }) cellEdit: EventEmitter<Edition.SaveDataDetails>;

  /** Close editor event */
  @Event({ bubbles: false }) closeEdit: EventEmitter<boolean | undefined>;

  private currentEditor: Edition.EditorBase | null = null;
  private saveRunning = false;

  @Method() async cancel() {
    this.saveRunning = true;
  }

  onAutoSave() {
    this.saveRunning = true;
    const val = this.currentEditor.getValue && this.currentEditor.getValue();
    // for editor plugin internal usage in case you want to stop save and use your own
    if (this.currentEditor.beforeAutoSave) {
      const canSave = this.currentEditor.beforeAutoSave(val);
      if (canSave === false) {
        return;
      }
    }
    this.onSave(val, true);
  }

  /** Callback triggered on cell editor save */
  onSave(val: Edition.SaveData, preventFocus?: boolean): void {
    this.saveRunning = true;
    if (this.editCell) {
      this.cellEdit.emit({
        rgCol: this.editCell.x,
        rgRow: this.editCell.y,
        val,
        preventFocus,
      });
    }
  }

  // shouldn't be cancelled by saveRunning
  // editor requires getValue
  saveBeforeClose() {
    if (!this.saveRunning) {
      this.onAutoSave();
    }
  }

  componentWillRender(): void {
    // we have active editor
    if (this.currentEditor) {
      return;
    }
    this.saveRunning = false;
    // fresh run
    // editor defined for the column
    if (this.editor) {
      this.currentEditor = new this.editor(
        this.column,
        (e, preventFocus) => {
          this.onSave(e, preventFocus);
        },
        focusNext => {
          this.saveRunning = true;
          this.closeEdit.emit(focusNext);
        },
      );
      return;
    }
    // default text editor usage
    this.currentEditor = new TextEditor(this.column, (e, preventFocus) => this.onSave(e, preventFocus));
  }

  componentDidRender(): void {
    if (!this.currentEditor) {
      return;
    }
    this.currentEditor.element = this.element.firstElementChild;
    this.currentEditor.componentDidRender && this.currentEditor.componentDidRender();
  }

  disconnectedCallback(): void {
    this.saveBeforeClose();

    this.saveRunning = false;
    if (!this.currentEditor) {
      return;
    }

    this.currentEditor.disconnectedCallback && this.currentEditor.disconnectedCallback();
    if (this.currentEditor.element) {
      this.currentEditor.element = null;
    }
    this.currentEditor = null;
  }

  render() {
    if (this.currentEditor) {
      this.currentEditor.editCell = this.editCell;
      return <Host class={EDIT_INPUT_WR}>{this.currentEditor.render(h)}</Host>;
    }
    return '';
  }
}
