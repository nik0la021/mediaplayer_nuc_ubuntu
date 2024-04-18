import React, {Fragment} from 'react';
import {NotificationManager} from 'react-notifications';

import StaticIPFormComponent from './StaticIPFormComponent';
import Spinner from './Spinner';

class EthernetFormComponent extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showSpinner: false
        }
    }

    handleConnectButtonClick = async (staticData) => {
        const isValid = this.checkRequestData(staticData);
        if (!isValid) {
            return;
        }

        const ethRequestData = new URLSearchParams();
        ethRequestData.append('type', 'ethDataConnect');
        ethRequestData.append('includeStatic', true);
        ethRequestData.append('ipAddress', staticData.ipAddress);
        ethRequestData.append('subnetMask', staticData.subnetMask);
        ethRequestData.append('defaultGateway', staticData.defaultGateway);
        ethRequestData.append('preferredDns', staticData.preferredDns);
        ethRequestData.append('alternativeDns', staticData.alternativeDns);

        const ethRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: ethRequestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', ethRequestOptions);
            const jsonData = await response.json();
            await this.processEthConnectionResult(jsonData, staticData.ipAddress);
        } catch(err) {
            NotificationManager.error('Error on Ethernet connect request', 'Error', 1500);
        }
    }

    handleStoreButtonClick = async (staticData) => {
        const isValid = this.checkRequestData(staticData);
        if (!isValid) {
            return;
        }

        const ethRequestData = new URLSearchParams();
        ethRequestData.append('type', 'ethDataStore');
        ethRequestData.append('includeStatic', true);
        ethRequestData.append('ipAddress', staticData.ipAddress);
        ethRequestData.append('subnetMask', staticData.subnetMask);
        ethRequestData.append('defaultGateway', staticData.defaultGateway);
        ethRequestData.append('preferredDns', staticData.preferredDns);
        ethRequestData.append('alternativeDns', staticData.alternativeDns);

        const ethRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: ethRequestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', ethRequestOptions);
            const jsonData = await response.json();

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));
            
            if (jsonData.status === 'Success') {
                NotificationManager.success(jsonData.message, 'Success', '1500');
            }
            else {
                NotificationManager.error('Error storing connection', 'Error', 1500);
            }
        } catch(err) {
            NotificationManager.error('Error on Ethernet store request', 'Error', 1500);
        }
    }

    checkRequestData = (staticData) => {
        if (staticData !== undefined && staticData.ipAddress === '') {
            NotificationManager.warning('IP address field not set', 'Warning', 1500);
            return false;
        }

        if (staticData !== undefined && staticData.subnetMask === '') {
            NotificationManager.warning('Subnet mask field not set', 'Warning', 1500);
            return false;
        }

        if (staticData !== undefined && staticData.defaultGateway === '') {
            NotificationManager.warning('Default gateway field not set', 'Warning', 1500);
            return false;
        }

        return true;
    }

    processEthConnectionResult = async (result, ipAddress) => {
        if (result.netService !== 'OK') {
            NotificationManager.error('Networking service restart error', 'Error', 1500);
        }

        else {
            NotificationManager.success('Networking service restart successful', 'Success', 1500)

            const availability = await this.checkNetworkAvailability(result.connId, ipAddress);

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));
            
            availability.ipAddress !== 'Not connected'
            ? NotificationManager.success(`Connected to Ethernet network\n IP Address: ${ipAddress}`)
            : NotificationManager.error(`Can't connect to Ethernet network`, 'Error', 1500);

            availability.ping.googleStatus === 'Ping success'
            ? NotificationManager.success('Google DNS reached', 'Success', 1500)
            : NotificationManager.error('Can\'t reach Google DNS', 'Error', 1500);

            availability.ping.screensStatus === 'Ping success'
            ? NotificationManager.success('Screens server reached', 'Success', 1500)
            : NotificationManager.error('Can\'t reach Screens server', 'Error', 1500);            
        }
    }

    checkNetworkAvailability = async (connId, ipAddress) => {
        const checkNetworkRequestData = new URLSearchParams();
        checkNetworkRequestData.append('type', 'ethNetworkCheck');
        checkNetworkRequestData.append('id', connId);
        checkNetworkRequestData.append('ipAddress', ipAddress);

        const checkNetworkRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: checkNetworkRequestData
        }

        try {
            const response = await fetch('http://localhost:8080', checkNetworkRequestOptions);
            return await response.json();
        } catch (err) {
            NotificationManager.error('Error on check network request', 'Error', 1500);
        }
    }

    handleBackButtonClick = () => {
        this.props.onBack();
    }

    renderSpinner = () => {
        return this.state.showSpinner ? <Spinner /> : null;
    }

    renderFormBody = () => {
        return <StaticIPFormComponent type={'Ethernet'}
                                onConnect={this.handleConnectButtonClick}
                                onStore={this.handleStoreButtonClick}
                                onBack={this.handleBackButtonClick}
                                showSpinner={this.state.showSpinner}/>;
    }

    render() {
        return (
            <Fragment>
                {this.renderSpinner()}
                {this.renderFormBody()}
            </Fragment>
        );
    }
}

export default EthernetFormComponent;