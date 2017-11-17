import React from 'react';
import PropTypes from 'prop-types';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { Tabs, Button, Popconfirm } from 'antd';
import classnames from 'classnames';

import {
  PREFIX,
  LOADING,
  YAML,
  RESOURCE_ID,
  CATALOG_LOADING_STAGE,
  NO_NAMESPACE,
  NO_NAME,
  itemGet,
  itemPost,
  itemPut,
  itemDelete,
  tabsClose,
  tabOpen,
  tabClose,
} from 'modules/k8s';

import Editor from './Editor';
import css from './index.css';


@connect(
  state => state[PREFIX],
  dispatch => bindActionCreators({
    itemGet,
    itemPost,
    itemPut,
    itemDelete,
    tabOpen,
    tabClose,
    tabsClose,
  }, dispatch),
)

export default class Content extends React.Component {

  static propTypes = {
    flags: PropTypes.object.isRequired,
    items: PropTypes.object.isRequired,
    tabs: PropTypes.object.isRequired,
    itemGet: PropTypes.func.isRequired,
    itemPost: PropTypes.func.isRequired,
    itemPut: PropTypes.func.isRequired,
    itemDelete: PropTypes.func.isRequired,
    tabsClose: PropTypes.func.isRequired,
    tabOpen: PropTypes.func.isRequired,
    tabClose: PropTypes.func.isRequired,
  };

  static renderTab({ id, item, yaml, resources }) {

    const {
      metadata: {
        name: itemName = NO_NAME,
        namespace: itemNamespace = NO_NAMESPACE,
      } = {},
      [YAML]: yamlOriginal,
      [RESOURCE_ID]: resourceId,
    } = item || {};

    return (
      <Tabs.TabPane
        key={id}
        tab={
          <span
            className={classnames({
              [css.tabModified]: yaml && yaml !== yamlOriginal,
              [css.tabDetached]: !item,
            })}>
            {`${itemNamespace} • ${resourceId} • ${itemName}`}
          </span>
        }
        closable
      />
    );
  }

  shouldComponentUpdate(props) {

    return !props.flags[CATALOG_LOADING_STAGE];
  }

  state = {

    /* [id]: yaml */
  };

  notstate = {
    // not state to save excessive renders
    // because monaco doesn't accept these params as react arguments
    // and should be manipulated directly instead

    cursorPositions: {
      /*
        [id]: {
          lineNumber: Number,
          column: Number,
        }
      */
    },

    scrollPositions: {
      /*
        [id]: {
          scrollTop: Number,
          scrolleft: Number,
        }
      */
    },
  };

  elements = {

    editor: undefined,
  };


  // antd-specific handlers
  // ------------------------

  tabsOnChange = id => {
    const {
      props: {
        tabOpen,
      },
      notstate: {
        cursorPositions: { [id]: cursorPosition },
        scrollPositions: { [id]: scrollPosition },
      },
      editorSetCursor,
      editorSetScroll,
    } = this;

    tabOpen(id, null, () => {
      setTimeout(() => {
        if (cursorPosition) editorSetCursor(cursorPosition);
        if (scrollPosition) editorSetScroll(scrollPosition);
      });
    });
  };

  tabsOnEdit = (id, action) => {
    switch (action) {
      case 'add':
        const {
          props: {
            tabs: {
              id: tabId,
            },
            items: {
              [tabId]: {
                [YAML]: itemYaml,
              } = {},
            },
            tabOpen,
          },
          state: {
            [tabId]: tabYaml,
          },
        } = this;
        return tabOpen(
          null,
          tabYaml || itemYaml,
          ({ id, yaml }) => this.setState({ [id]: yaml }),
        );
      case 'remove':
        const {
          props: {
            tabClose,
          },
        } = this;
        return tabClose(id);
      default:
        return false;
    }
  };

  tabsOnClose = () => {

    this.props.tabsClose();
  };


  // editor actions
  // ----------------

  editorOnInit = editor => {
    const { elements } = this;
    elements.editor = editor;
  };

  editorOnValue = yaml => {
    const { tabs: { id }} = this.props;
    if (id) this.setState({ [id]: yaml });
  };

  editorOnCursor = cursorPosition => {
    const {
      props: { tabs: { id } },
      notstate: { cursorPositions },
    } = this;
    if (id) cursorPositions[id] = cursorPosition;
  };

  editorOnScroll = scrollPosition => {
    const {
      props: { tabs: { id } },
      notstate: { scrollPositions },
    } = this;
    if (id) scrollPositions[id] = scrollPosition;
  };

  editorSetFocus = () => {
    const { editor } = this.elements;
    editor.setFocus();
  };

  editorSetCursor = cursorPosition => {
    const { editor } = this.elements;
    editor.setCursorPosition(cursorPosition);
  };

  editorSetScroll = scrollPosition => {
    const { editor } = this.elements;
    editor.setScrollPosition(scrollPosition);
  };


  // tab actions
  // -------------

  tabOnOpen = () => {

    this.tabsOnEdit(null, 'add');
  };

  tabOnClose = () => {

    this.tabsOnEdit(this.props.tabs.id, 'remove');
  };

  tabOnReload = () => {
    const { tabs: { id }, itemGet } = this.props;
    return new Promise(resolve => itemGet(id, resolve))
      .then(() => this.setState({ [id]: null }));
  };

  tabOnSave = () => {
    const {
      props: {
        tabs: { id },
        items: { [id]: item },
        itemPost,
        itemPut,
      },
      state: { [id]: yaml },
    } = this;

    return new Promise(resolve => (item ? itemPut : itemPost)(id, yaml, resolve))
      .then(payload => {
        const { conflict } = payload;
        if (!conflict) this.setState({ [id]: null });
      });
  };

  tabOnDelete = () => {
    const { tabs: { id }, itemDelete } = this.props;
    return new Promise(resolve => itemDelete(id, resolve))
      .then(() => this.setState({ [id]: null }));
  };


  // ui
  // ----

  render() {

    const {

      props: {
        tabs: {
          id,
          ids: tabIds,
        },
        items,
        items: {
          [id]: item,
          [id]: {
            [LOADING]: itemLoading,
            [YAML]: yamlOriginal,
          } = {},
        },
      },

      state,
      state: {
        [id]: yamlEdited,
      },

      tabsOnChange,
      tabsOnEdit,
      tabsOnClose,

      editorOnInit,
      editorOnValue,
      editorOnCursor,
      editorOnScroll,

      tabOnOpen,
      tabOnClose,
      tabOnReload,
      tabOnSave,
      tabOnDelete,
    } = this;

    const isEdited = yamlEdited && (yamlEdited !== yamlOriginal);

    const hideTabs = false;
    const hideEditor = !tabIds.length;
    const hideCloseAll = !tabIds.length;

    return (
      <div
        className={classnames(
          css.content,
          {
            [css.hideTabs]: hideTabs,
            [css.hideEditor]: hideEditor,
          },
        )}>
        <Tabs
          type="editable-card"
          activeKey={id}
          onChange={tabsOnChange}
          onEdit={tabsOnEdit}
          hideAdd
          tabBarExtraContent={
            <span>
              <span className={css.buttonGroup}>
                <Button
                  className={css.button}
                  shape="circle"
                  icon="plus"
                  size="small"
                  onClick={tabOnOpen}
                  title="Open new tab"
                />
                <Button
                  className={css.button}
                  shape="circle"
                  icon="close"
                  size="small"
                  onClick={tabsOnClose}
                  disabled={hideCloseAll}
                  title="Close all tabs"
                />
              </span>
              <span className={css.buttonGroup}>
                <Button
                  className={css.button}
                  shape="circle"
                  icon="reload"
                  size="small"
                  onClick={tabOnReload}
                  disabled={!item || itemLoading}
                  title="Reload, ⌘⌥R"
                />
                <Button
                  className={css.button}
                  shape="circle"
                  icon="save"
                  size="small"
                  type="primary"
                  onClick={tabOnSave}
                  disabled={!isEdited || itemLoading}
                  title="Save, ⌘⌥S"
                />
                <Popconfirm
                  placement="bottomRight"
                  title="Are you sure to delete this item?"
                  okText="Yes" cancelText="No"
                  onConfirm={tabOnDelete}>
                  <Button
                    className={css.button}
                    shape="circle"
                    icon="delete"
                    size="small"
                    type="danger"
                    disabled={!item || itemLoading}
                    title="Delete"
                  />
                </Popconfirm>
              </span>
            </span>
          }>
          {
            tabIds.map(itemId =>
              Content.renderTab({
                id: itemId,
                item: items[itemId],
                yaml: state[itemId],
              })
            )
          }
        </Tabs>
        <Editor
          ref={editorOnInit}

          original={yamlOriginal}
          value={yamlEdited || yamlOriginal}

          onValue={editorOnValue}
          onCursor={editorOnCursor}
          onScroll={editorOnScroll}

          onSave={tabOnSave}
          onClose={tabOnClose}
          onReload={tabOnReload}
        />
        {
          hideEditor &&
          <table className={css.legend}>
            <tbody>
              <tr>
                <td>⌘&nbsp;+&nbsp;⌥&nbsp;+&nbsp;S</td>
                <td>Tab.Save</td>
              </tr>
              <tr>
                <td>⌘&nbsp;+&nbsp;⌥&nbsp;+&nbsp;C</td>
                <td>Tab.Close</td>
              </tr>
              <tr>
                <td>⌘&nbsp;+&nbsp;⌥&nbsp;+&nbsp;R</td>
                <td>Tab.Reload</td>
              </tr>
            </tbody>
          </table>
        }
      </div>
    );
  }
}
