import React, { Fragment } from "react";

class TablesComponent extends React.Component {
  render() {
    return (
      <Fragment>
        <div className="col-sm-12 col-md-5">
          <table className="table text-white">
            <tbody>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  Model:
                </th>
                <td>
                  {this.props.data.os.model
                    .replace(/\0/g, "")
                    .replace(" Plus", "+")}
                </td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  Name:
                </th>
                <td>
                  {this.props.data.software.registration.name
                    .replace(" (No server connection)", "")
                    .replace(" (No connection)", "")}
                </td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  Company:
                </th>
                <td>
                  {this.props.data.software.registration.company
                    .replace(" (No server connection)", "")
                    .replace(" (No connection)", "")}
                </td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  Mode:
                </th>
                <td>
                  {this.props.data.software.registration.deviceMode
                    ? this.props.data.software.registration.deviceMode === 1
                      ? "Screens"
                      : "Info Channel"
                    : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="col-sm-12 col-md-5 offset-md-1">
          <table className="table text-white">
            <tbody>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  OS version:
                </th>
                <td>
                  {this.props.data.os.version.replace(/['"]+/g, "")}
                </td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  App version:
                </th>
                <td>
                  Multimedia {this.props.data.software.version}
                </td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  Eth0 [{this.props.data.network.ethMAC}]:
                </th>
                <td>{this.props.data.network.ethIP}</td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  Wlan0 [{this.props.data.network.wifiMAC}]:
                </th>
                <td>{this.props.data.network.wifiIP}</td>
              </tr>
              <tr>
                <th scope="row" className="text-bold text-uppercase">
                  SSID:
                </th>
                <td>{this.props.data.network.wifiSSID}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Fragment>
    );
  }
}

export default TablesComponent;
