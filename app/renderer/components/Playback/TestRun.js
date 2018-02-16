import React, { Component } from 'react';
import { shell } from 'electron';
import moment from 'moment';
import { Icon, Modal, Table, Button } from 'antd';
import { toPairs, sum } from 'lodash';
import PlaybackStyles from './PlaybackLibrary.css';
import { iconForState, stateDataForTest, getTestResult, getTest,
  getSessionId, getTestUrl
} from './shared';

export default class TestRun extends Component {

  getTestStatus () {
    const {actionsStatus} = this.props;
    return stateDataForTest(actionsStatus);
  }

  getTestTime () {
    return sum(this.props.actionsStatus.map((action) => action.elapsedMs || 0));
  }

  getTestNameToShow () {
    const {testToRun, testResultToShow} = this.props;
    return testToRun || testResultToShow;
  }

  isModalVisible () {
    return !!(this.getTestNameToShow());
  }

  getTestToShow () {
    const {testToRun, savedTests, testResults, testResultToShow} = this.props;

    if (testToRun) {
      return getTest(testToRun, savedTests);
    }

    return getTestResult(testResultToShow, testResults);
  }

  getActionsToShow () {
    const {testToRun, testResultToShow, testResults, actionsStatus} = this.props;
    if (testToRun) {
      return actionsStatus;
    }

    if (testResultToShow) {
      return getTestResult(testResultToShow, testResults).actions;
    }

    return [];
  }

  getTestHeader () {
    const {serverType} = this.props;
    const test = this.getTestToShow();
    let testTime = this.getTestTime();
    testTime = testTime ? `(${testTime / 1000}s)` : '';

    const testStatus = this.getTestStatus();

    return <div className={`${PlaybackStyles.testStatus} ${PlaybackStyles[testStatus.className]}`}>
      <span style={{color: testStatus.color}}><Icon type={testStatus.icon} />&nbsp;&nbsp;<b>{testStatus.text}</b> {testTime}</span>
      {test &&
        <div className={PlaybackStyles.testMetadata}>
          <div><b>App:</b> <code>{test.caps.app || test.caps.browserName}</code></div>
          <div><b>Platform:</b> <code>{test.caps.platformName}</code></div>
          <div><b>Server Type:</b> <code>{test.serverType || serverType}</code></div>
          {test.date &&
            <div><b>Run at:</b> <code>{moment(test.date).format("YYYY-MM-DD HH:SS")}</code></div>
          }
        </div>
      }
    </div>;
  }

  getTableData () {

    const columns = [{
      title: 'Step',
      dataIndex: 'key',
      key: 'key',
      width: 60,
      render: (text) => <div className={PlaybackStyles.stepNum}>
        {parseInt(text, 10) + 1}
      </div>
    }, {
      title: 'Status',
      dataIndex: 'state',
      key: 'state',
      width: 60,
      render: (state) => {
        const {icon, color} = iconForState(state);
        return <Icon
          type={icon}
          style={{color}}
          className={PlaybackStyles.statusIcon}
        />;
      }
    }, {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (text, record) => {
        let actionStep = <pre>
          {record.isElCmd && <span>&nbsp;&nbsp;<Icon type="arrow-right" />&nbsp;</span>}
          {text}
        </pre>;

        if (record.action.indexOf('findElement') === 0) {
          actionStep = <div>
            <div><pre>{record.action}</pre></div>
            <div className={PlaybackStyles.findElInfo}>
              <div>Strategy: <code>{record.params[0]}</code></div>
              <div>Selector: <code>"{record.params[1]}"</code></div>
            </div>
          </div>;
        }

        if (!record.err) {
          return actionStep;
        }

        let errText = record.err.message;

        return <div>
          {actionStep}
          <div className={PlaybackStyles.actionErr}>{errText}</div>
        </div>;
      }

    }, {
      title: 'Time',
      dataIndex: 'elapsedMs',
      key: 'elapsedMs',
      width: 60,
      render: (text, record) => {
        let timeText = "";
        if (record.elapsedMs) {
          timeText = `${record.elapsedMs / 1000}s`;
        }
        return <div className={PlaybackStyles.elapsedTime}>
          {timeText}
        </div>;
      }
    }];

    let data = [];
    for (let [index, action] of toPairs(this.getActionsToShow())) {
      data.push({
        ...action,
        key: index
      });
    }

    return {data, columns};
  }

  render () {
    const {isTestRunning, hideTestRunModal, serverType} = this.props;
    const sessionId = getSessionId(this.getActionsToShow());
    const showBrowserLink = serverType !== "local" && serverType !== "remote";
    const browserUrl = showBrowserLink ? getTestUrl(serverType, sessionId) : null;

    let testName = null;
    const visible = this.isModalVisible();
    const test = this.getTestToShow();

    if (visible) {
      testName = test.name;
    }

    const {columns, data} = this.getTableData();

    return <Modal
      className={PlaybackStyles.testRunModal}
      visible={visible}
      closable={false}
      footer={
        <div>
          {(sessionId && showBrowserLink) &&
            <Button onClick={(e) => e.preventDefault() || shell.openExternal(browserUrl)}><Icon type="link" /> Open in Browser</Button>
          }
          <Button onClick={hideTestRunModal} disabled={isTestRunning}>Done</Button>
        </div>
      }
      title={testName}
    >

      {this.getTestHeader()}

      <Table
        columns={columns}
        showHeader={false}
        bordered={false}
        dataSource={data}
        pagination={false}
      />
    </Modal>;
  }
}
