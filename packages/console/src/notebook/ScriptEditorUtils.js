const LANGUAGES = { groovy: 'Groovy', python: 'Python' };

const LINE_COMMENTS = { groovy: '//', python: '#' };

class ScriptEditorUtils {
  /** Get PQ script language from Monaco language
   * @param {string} language Monaco language
   * @returns {string} PQ script language
   */
  static normalizeScriptLanguage(language) {
    return LANGUAGES[language] || null;
  }

  /**
   * Get a tooltip for disabled button based on the session status and language
   * @param {boolean} isSessionConnected True if console session connected
   * @param {boolean} isLanguageMatching True if the script language is matching the session language
   * @param {string} scriptLanguageLabel Language label to use in the tooltip message
   * @param {string} buttonLabel Button label to use in the tooltip message
   * @returns {string} Tooltip message or `null` if the session is connected and language is matching
   */
  static getDisabledRunTooltip(
    isSessionConnected,
    isLanguageMatching,
    scriptLanguageLabel,
    buttonLabel
  ) {
    if (!isSessionConnected) {
      return `Console session not connected – ${buttonLabel} disabled`;
    }
    if (!isLanguageMatching) {
      return `${scriptLanguageLabel} doesn't match the session language – ${buttonLabel} disabled`;
    }
    return null;
  }

  /**
   * Retrieve the line number of the next line beginning with a comment, or null if there are no more matches
   * @param {ITextModel} model The text model to get the next line for
   * @param {number} startLine The line to start searching from. If this line is a comment, it will match
   * @param {string} language The language of the model
   * @returns {number|null} The next line, or null if none found or past the end of the document
   */
  static getNextCommentLine(model, startLine, language) {
    const commentStr = LINE_COMMENTS[language];
    const lineCount = model.getLineCount();
    for (let line = startLine; line <= lineCount; line += 1) {
      const value = model.getValueInRange({
        startColumn: 1,
        startLineNumber: line,
        endColumn: 1 + commentStr.length,
        endLineNumber: line,
      });
      if (value === commentStr) {
        return line;
      }
    }
    return null;
  }
}

export default ScriptEditorUtils;
