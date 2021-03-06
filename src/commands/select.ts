// Select / extend: https://github.com/mawww/kakoune/blob/master/doc/pages/keys.asciidoc#movement
import * as vscode from 'vscode'

import { registerCommand, Command, CommandFlags, InputKind } from '.'


registerCommand(Command.selectionsReduce, CommandFlags.ChangeSelections, editor => {
  editor.selections = editor.selections.map(x => new vscode.Selection(x.active, x.active))
})

registerCommand(Command.selectionsFlip, CommandFlags.ChangeSelections, editor => {
  editor.selections = editor.selections.map(x => new vscode.Selection(x.active, x.anchor))
})

registerCommand(Command.selectionsForward, CommandFlags.ChangeSelections, editor => {
  editor.selections = editor.selections.map(x => x.isReversed ? new vscode.Selection(x.start, x.end) : x)
})

registerCommand(Command.selectionsBackward, CommandFlags.ChangeSelections, editor => {
  editor.selections = editor.selections.map(x => x.isReversed ? x : new vscode.Selection(x.end, x.start))
})

registerCommand(Command.selectionsMerge, CommandFlags.ChangeSelections, editor => {
  const selections = editor.selections

  // VS Code automatically merges overlapping selections, so here
  // all we have to do is to merge non-overlapping contiguous selections
  for (let i = 0; i < selections.length; i++) {
    const refSel = selections[i]
    const refLine = editor.document.lineAt(refSel.start)

    if (refSel.end.character !== refLine.range.end.character)
      // Not at the end of the line? We don't care
      continue

    for (let j = 0; j < selections.length; j++) {
      if (i === j)
        continue

      const cmpSel = selections[j]

      if (cmpSel.start.character !== 0)
        // Not at the beginning of the line? We don't care
        continue

      selections.splice(j, 1)
      selections[i--] = new vscode.Selection(refSel.start, cmpSel.end)

      break
    }
  }

  editor.selections = selections
})

registerCommand(Command.selectionsAlign, CommandFlags.Edit, editor => {
  const startChar = editor.selections.reduce((max, sel) => sel.start.character > max ? sel.start.character : max, 0)

  return builder => {
    for (const selection of editor.selections)
      builder.insert(selection.start, ' '.repeat(startChar - selection.start.character))
  }
})

registerCommand(Command.selectionsAlignCopy, CommandFlags.Edit, (editor, state) => {
  const sourceSelection = editor.selections[state.currentCount] || editor.selection
  const sourceIndent = editor.document.lineAt(sourceSelection.start).firstNonWhitespaceCharacterIndex

  return builder => {
    for (let i = 0; i < editor.selections.length; i++) {
      if (i === sourceSelection.start.line)
        continue

      const line = editor.document.lineAt(editor.selections[i].start)
      const indent = line.firstNonWhitespaceCharacterIndex

      if (indent > sourceIndent)
        builder.delete(line.range.with(undefined, line.range.start.translate(undefined, indent - sourceIndent)))
      else if (indent < sourceIndent)
        builder.insert(line.range.start, ' '.repeat(indent - sourceIndent))
    }
  }
})


registerCommand(Command.selectionsClear, CommandFlags.ChangeSelections, editor => {
  editor.selections = [editor.selection]
})

registerCommand(Command.selectionsClearMain, CommandFlags.ChangeSelections, editor => {
  if (editor.selections.length > 1)
    editor.selections = editor.selections.slice(1)
})

registerCommand(Command.selectionsKeepMatching, CommandFlags.ChangeSelections, InputKind.RegExp, '', (editor, { input: regex }) => {
  const newSelections = editor.selections.filter(x => regex.test(editor.document.getText(x)))

  if (newSelections.length === 0)
    editor.selections = [editor.selection]
  else
    editor.selections = newSelections
})

registerCommand(Command.selectionsClearMatching, CommandFlags.ChangeSelections, InputKind.RegExp, '', (editor, { input: regex }) => {
  const newSelections = editor.selections.filter(x => !regex.test(editor.document.getText(x)))

  if (newSelections.length === 0)
    editor.selections = [editor.selection]
  else
    editor.selections = newSelections
})
