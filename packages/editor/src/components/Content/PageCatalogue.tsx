import React from 'react';
import { Anchor, Divider, Tooltip } from 'antd';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { HeadingItem } from '@tuture/core';

/** @jsx jsx */
import { css, jsx } from '@emotion/core';
import { Dispatch, Store, RootState } from 'store';

const { Link } = Anchor;

function getCommit(linkId: string, catalogue: HeadingItem[]) {
  const index = catalogue.map(({ id }) => id).indexOf(linkId);

  for (let i = index; i >= 0; i--) {
    if (catalogue[i].commit) {
      return catalogue[i].commit;
    }
  }

  return null;
}

function getHeadingDepth(type: string) {
  switch (type) {
    case 'heading-two':
      return 1;
    case 'heading-three':
      return 2;
    case 'heading-four':
      return 3;
    case 'heading-five':
      return 4;
    case 'heading-six':
      return 5;
    default:
      return 1;
  }
}

function PageCatalogue() {
  const dispatch = useDispatch<Dispatch>();
  const store = useStore() as Store;
  const nowArticleCatalogue =
    useSelector<RootState, HeadingItem[]>(
      store.select.collection.nowArticleCatalogue,
    ) || [];

  function onChange(link: string) {
    const commit = getCommit(link.slice(1), nowArticleCatalogue);

    if (link && commit) {
      dispatch.collection.setNowStepCommit(commit);
    }
  }

  return (
    <div
      css={css`
        padding-top: 40px;
        padding-left: 8px;
        padding-right: 8px;
        height: calc(100vh - 64px);
        background-color: #f7f7fa;
        &::-webkit-scrollbar {
          display: none;
        }

        -ms-overflow-style: none; // IE 10+
        overflow: -moz-scrollbars-none; // Firefox
      `}
    >
      <div
        css={css`
          padding-left: 16px;
          padding-right: 16px;
        `}
      >
        <h4
          css={css`
            font-size: 16px;
            font-family: PingFangSC-Medium, PingFang SC;
            font-weight: 500;
            color: #595959;
            line-height: 24px;
            margin-bottom: 4px;
          `}
        >
          大纲
        </h4>

        <Divider
          css={css`
            margin: 16px 0 0;
          `}
        />
      </div>
      <div
        css={css`
          padding-top: 16px;
          padding-bottom: 48px;
          max-height: calc(100vh - 64px - 70px - 10px);
          overflow-y: auto;

          &::-webkit-scrollbar {
            display: none;
          }

          -ms-overflow-style: none; // IE 10+
          overflow: -moz-scrollbars-none; // Firefox
        `}
      >
        <Anchor
          css={css`
            background: transparent;

            & .ant-anchor-ink::before {
              background: transparent;
            }
          `}
          targetOffset={64}
          onChange={onChange}
          affix={false}
          getContainer={() => document.getElementById('scroll-container')!}
        >
          {nowArticleCatalogue.map((item) => (
            <Link
              key={item.id}
              href={`#${item.id}`}
              title={
                <Tooltip placement="right" title={item.title}>
                  <span>{item.title}</span>
                </Tooltip>
              }
              css={css`
                padding-left: ${getHeadingDepth(item.type) * 16}px;

                & > a {
                  color: ${getHeadingDepth(item.type) === 1
                    ? 'rgba(0,0 ,0, 1)'
                    : 'rgba(0, 0, 0, .65)'};
                }
              `}
            />
          ))}
        </Anchor>
      </div>
    </div>
  );
}

export default PageCatalogue;
