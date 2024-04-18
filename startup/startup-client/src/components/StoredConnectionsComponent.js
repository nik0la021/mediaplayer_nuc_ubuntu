import React, {Fragment} from 'react';
import {NotificationManager} from 'react-notifications';

import Spinner from './Spinner';

class StoredConnectionsComponent extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            connections: this.props.connections || {},
            wifiDisplayNames: getWifiNames(this.props.connections.wifi),
            showSpinner: false
        }
    }

    handleDeleteConnectionButtonClick = async (type, id, networkId, hasStatic) => {
        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        const deleteConnRequestData = new URLSearchParams();
        deleteConnRequestData.append('type', 'deleteConnection');
        deleteConnRequestData.append('connectionType', type);
        deleteConnRequestData.append('id', id);
        deleteConnRequestData.append('networkId', networkId);
        deleteConnRequestData.append('hasStaticData', hasStatic);

        const deleteConnRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: deleteConnRequestData
        }

        try {
            const response = await fetch('http://localhost:8080', deleteConnRequestOptions);
            const jsonData = await response.json();

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));
            
            if (jsonData.status === 'Success') {
                this.deleteConnection(type, id);
                NotificationManager.success(`Deleted ${networkId}`, 'Success', 1500);
            }
            else {
                NotificationManager.error(`Can't delete ${networkId}`, 'Error', 1500);
            }
        } catch(err) {
            NotificationManager.error('Error on delete connection request', 'Error', 1500);
        }
    }

    deleteConnection = (type, id) => {
        if (type === 'wifi') {
            this.setState(prevState => {
                const currentConnections = [...prevState.connections.wifi];
                const updatedConnections = currentConnections.filter(conn => conn.id !== id);

                return {connections: {
                    wifi: updatedConnections,
                    eth: prevState.connections.eth
                }};
            });
        }
        else if (type === 'eth') {
            this.setState(prevState => {
                const currentConnections = [...prevState.connections.eth];
                const updatedConnections = currentConnections.filter(conn => conn.id !== id);

                return {connections: {
                    wifi: prevState.connections.wifi,
                    eth: updatedConnections
                }}
            });
        }
    }

    handleBackButtonClick = () => {
        this.props.onBack();
    }

    renderStoredConnections = () => {
        let renderConnections = [];

        this.state.connections.wifi.forEach(conn => {
            renderConnections.push(this.renderWifiConnection(conn));
        });

        this.state.connections.eth.forEach(conn => {
            renderConnections.push(this.renderEthernetConnection(conn));
        });

        return renderConnections;
    }

    renderWifiConnection = (conn) => {
        return (
            <li>
                <span className="mr-3">
                    <i className="fa fa-wifi"></i>
                </span>
                <p className="font-weight-bold">{conn.ssid}</p> {`${this.showWifiPassword(conn)} ${this.showWifiStaticSettings(conn)}`}
                {this.renderPasswordToggler(conn)}
                <span className="ml-3" onClick={() => {this.handleDeleteConnectionButtonClick('wifi', conn.id, conn.ssid, hasStaticSettings(conn))}}>
                    <i className="fa fa-times fa-lg"></i>
                </span>
            </li>
        );
    }

    showWifiPassword = (conn) => {
        const currentConnection = this.state.wifiDisplayNames.find(connection => connection.id === conn.id);
        return currentConnection.showPassword ? conn.password : 'xxxxxxx';
    }

    showWifiStaticSettings = (conn) => {
        if (hasStaticSettings(conn)) {
            return `${conn.static.ipAddress} ${conn.static.subnetMask} ${conn.static.defaultGateway}`;
        }

        return '';
    }

    renderPasswordToggler = (conn) => {
        const currentConnection = this.state.wifiDisplayNames.find(connection => connection.id === conn.id);
        return currentConnection.showPassword
            ? (
                <span className="text-white ml-3 mr-3" onClick={() => {this.togglePasswordVisibility(conn.id)}}>
                    <i className="fa fa-eye fa-lg"></i>
                </span>
            )
            : (
                <span className="text-white ml-3 mr-3" onClick={() => {this.togglePasswordVisibility(conn.id)}}>
                    <i className="fa fa-eye-slash fa-lg"></i>
                </span>
            )
    }

    togglePasswordVisibility = (id) => {
        const clickedConnection = this.state.wifiDisplayNames.find(connection => connection.id === id);
        const clickedConnectionIndex = this.state.wifiDisplayNames.findIndex(connection => connection.id === id);
        const connections = [...this.state.wifiDisplayNames];

        clickedConnection.showPassword = !clickedConnection.showPassword;
        connections[clickedConnectionIndex] = clickedConnection;

        this.setState({wifiDisplayNames: connections});
    }

    renderEthernetConnection = (conn) => {
        return (
            <li>
                <span className="mr-3">
                    <i className="fa fa-plug"></i>
                </span>
                <p className="font-weight-bold">{conn.static.ipAddress}</p> {`${conn.static.subnetMask} ${conn.static.defaultGateway}`}
                <span className="ml-3" onClick={() => {this.handleDeleteConnectionButtonClick('eth', conn.id, conn.static.ipAddress, hasStaticSettings(conn))}}>
                    <i className="fa fa-times fa-lg"></i>
                </span>
            </li>
        );
    }

    renderBackButton = () => {
        return (
            <div className="row mt-3 justify-content-end">
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleBackButtonClick} disabled={this.state.showSpinner}>Back</button>
            </div>
        );
    }

    renderSpinner = () => {
        return this.state.showSpinner ? <Spinner /> : null;
    }

    render() {
        return (
            <Fragment>
                {this.renderSpinner()}
                <div className="row mb-3">
                    <div className="offset-md-2 col-md-6">
                        <h1 className="text-white text-uppercase">Stored connections</h1>
                    </div>
                </div>
                <div className="row mb-3">
                    <div className="offset-md-2 col-md-8 stored-connections-container">
                        <ul className="list-unstyled text-white stored-connections">
                            {this.renderStoredConnections()}
                        </ul>  
                    </div>
                </div>
                {this.renderBackButton()}
            </Fragment>
        );
    }
}

function getWifiNames(connections) {
    return connections.map(conn => {
        return {id: conn.id, ssid: conn.ssid, showPassword: false}
    });
}

function hasStaticSettings(connection) {
    return (connection.hasOwnProperty('static') && Object.keys(connection.static).length !== 0) ? true : false;
}

export default StoredConnectionsComponent;