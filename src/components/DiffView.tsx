import React, { Component } from 'react';
import { injectGlobal } from 'styled-components';
import classnames from 'classnames';

import Snippet from './Snippet';

import { Change as ChangeType, Hunk as HunkType } from '../types';

interface DiffViewProps {
  hunks: HunkType[];
}

injectGlobal`
  .diff {
    table-layout: fixed;
    border-collapse: collapse;
    width: 100%;
  }

  .diff-gutter-col {
    width: 50px;
  }

  .diff-gutter-omit {
    height: 0;
  }

  .diff-gutter-omit:before {
    content: " ";
    display: block;
    white-space: pre;
    width: 2px;
    height: 100%;
    margin-left: 2.2em;
    overflow: hidden;
  }

  .diff td {
    vertical-align: top;
  }
  .diff-line {
    line-height: 31px;
    font-family: Consolas, Courier, monospace;
  }

  .diff-gutter {
    max-width: 50px;
    padding: 0 16px;
  }

  .diff-gutter > a {
    color: inherit;
    display: block;
  }

  .diff-gutter:empty,
  .diff-gutter > a {
    text-align: right;
    cursor: pointer;
    -webkit-user-select: none;
      -moz-user-select: none;
        -ms-user-select: none;
            user-select: none;
  }

  .diff-gutter:empty:before,
  .diff-gutter > a:before {
    content: attr(data-line-number);
  }

  .diff-code-insert {
    font-weight: 700;
    background-color: rgba(0, 0, 0, .07);
  }

  .diff-code-delete {
    opacity: 0.3;
    background-color: rgba(0, 0, 0, .07);
  }

  .diff-gutter-omit {
    cursor: default;
  }

  .diff-gutter-selected {
    background-color: #fef6b9;
  }

  .diff-code {
    padding: 0 20px;
    max-width: 557px;
  }

  .diff-code-selected {
    color: #fffce0;
  }

  .diff-omit {
    color: #fafbfc;
  }

  .diff-hunk-header {
    line-height: 1.5;
  }

  .diff-hunk-header-content {
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
    padding: 0;
  }

  .diff-hunk-header {
    display: none;
  }

  .diff-file {
    color: rgba(0,0,0,0.84);
    display: block;
    padding-top: 8px;
    padding-bottom: 20px;
    background-color: rgba(0, 0, 0, .05);
    margin: 32px 0;
  }

  .diff-file-header {
    font-family: Monaco;
    font-size: 16px;
    color: rgba(0,0,0,0.24);
    text-align: right;
    padding-right: 20px;
  }

  .addition-count {
    margin-right: 1em;
    color: #88b149;
  }

  .deletion-count {
    margin-right: 1em;
    color: #ee5b60;
  }

`;

export default class DiffView extends Component<DiffViewProps> {
  renderRow = (change: ChangeType, isAllInsert: Boolean, key: number) => {
    const { type, content } = change;
    const codeClassName = classnames('diff-code', {
      [`diff-code-${type}`]: !isAllInsert,
    });
    return (
      <tr key={`change${key}`} className={classnames('diff-line')}>
        <td className={codeClassName}>
          <Snippet code={content} />
        </td>
      </tr>
    );
  };

  judgeAllRowInsertState = (changes: ChangeType[]) => {
    let isAllInsert = true;
    changes.map((change: ChangeType) => {
      const { type } = change;
      if (type !== 'insert') {
        isAllInsert = false;
      }
    });
    return changes.map((change, i) => {
      return this.renderRow(change, isAllInsert, i);
    });
  };

  render() {
    const { hunks } = this.props;

    return (
      <table className="diff">
        {hunks.map((hunk: HunkType, key: number) => (
          <tbody key={key} className={classnames('diff-hunk')}>
            {this.judgeAllRowInsertState(hunk.changes)}
          </tbody>
        ))}
      </table>
    );
  }
}
