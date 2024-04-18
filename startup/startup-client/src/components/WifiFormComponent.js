import React, {Fragment} from 'react';
import {NotificationManager} from 'react-notifications';
import Keyboard from 'react-simple-keyboard';
import isString from '../../node_modules/lodash/isString';

import StaticIPFormComponent from './StaticIPFormComponent';
import ChangeLocaleFormComponent from './ChangeLocaleFormComponent';
import Spinner from './Spinner';

const encryptionTypes = ['WPA / WPA2', 'WEP', 'OPEN'];

class WifiFormComponent extends React.Component {
    constructor(props) {
        super(props);

        this.keyboard = React.createRef();
        this.state = {
            ssid: '',
            password: '',
            encryption: 'Select type',
            displayStaticIPForm: false,
            displayChangeLocaleForm: false,
            ssidInputType: 'text',
            ssidSelectText: 'Select network',
            showPassword: false,
            showSpinner: false,
            keyboard: {
                layout: 'default',
                activeInput: ''
            }
        }
    }

    handleInputChange = (event) => {
        const setting = event.target.name;
        const value = event.target.value;

        this.setState({[setting]: value}, () => {
            this.keyboard.current.setInput(value, this.state.keyboard.activeInput)
        });
    }

    handleSSIDChange = (network) => {
        this.setState({
            ssid: network.ssid,
            encryption: network.security,
            ssidSelectText: `${network.ssid} - Quality: ${network.quality}`
        });
    }

    handleEncryptionChange = (encType) => {
        this.setState({encryption: encType});
    }

    handleKeyboardInputChange = (input) => {
        this.setState({
            [this.state.keyboard.activeInput]: input
        });
    }

    handleKeyboardButtonClick = (button) => {
        if (button === '{lock}' || button === '{shift}') {
            this.setState(prevState => {
                if (prevState.keyboard.layout === 'default') {
                    return {
                        keyboard: {
                            layout: 'shift', 
                            activeInput: prevState.keyboard.activeInput
                        }
                    }
                }
                else if (prevState.keyboard.layout === 'shift') {
                    return {
                        keyboard: {
                            layout: 'default', 
                            activeInput: prevState.keyboard.activeInput
                        }
                    }
                }
            });
        }
    }

    handleActiveInputChange = (event) => {
        const inputName = event.target.name;

        this.setState(prevState => ({
            keyboard: {
                layout: prevState.keyboard.layout,
                activeInput: inputName
            }
        }));
    }

    handleConnectButtonClick = async () => {
        const isValid = this.checkRequestData();
        if (!isValid) {
            return;
        }

        const wifiRequestData = this.setWifiRequestData('wifiDataConnect', false);

        const wifiRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: wifiRequestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', wifiRequestOptions);
            const jsonData = await response.json();
            await this.processWifiConnectionResult(jsonData, false);
        } catch (err) {
            NotificationManager.error('Error on WiFi connect request', 'Error', 1500);
        }
    }

    handleConnectWithStaticData = async (staticData) => {
        const isValid = this.checkRequestData(staticData);
        if (!isValid) {
            return;
        }

        const requestData = this.setWifiRequestData('wifiDataConnect', true);
        requestData.append('ipAddress', staticData.ipAddress);
        requestData.append('subnetMask', staticData.subnetMask);
        requestData.append('defaultGateway', staticData.defaultGateway);
        requestData.append('preferredDns', staticData.preferredDns);
        requestData.append('alternativeDns', staticData.alternativeDns);

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: requestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', requestOptions);
            const jsonData = await response.json();
            await this.processWifiConnectionResult(jsonData, true);
        } catch (err) {
            NotificationManager.error('Error on WiFi connect request', 'Error', 1500);
        }
    }

    handleStoreButtonClick = async () => {
        const isValid = this.checkRequestData();
        if (!isValid) {
            return;
        }

        const wifiRequestData = this.setWifiRequestData('wifiDataStore', false);

        const wifiRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: wifiRequestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', wifiRequestOptions);
            const jsonData = await response.json();

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));
            
            if (jsonData.status === 'Success') {
                NotificationManager.success(jsonData.message, 'Success', 1500);
            }
            else {
                NotificationManager.error('Error storing connection', 'Error', 1500);
            }
        } catch (err) {
            NotificationManager.error('Error on WiFi store request', 'Error', 1500);
        }
    }

    handleStoreWithStaticData = async (staticData) => {
        const isValid = this.checkRequestData(staticData);
        if (!isValid) {
            return;
        }

        const requestData = this.setWifiRequestData('wifiDataStore', true);
        requestData.append('ipAddress', staticData.ipAddress);
        requestData.append('subnetMask', staticData.subnetMask);
        requestData.append('defaultGateway', staticData.defaultGateway);
        requestData.append('preferredDns', staticData.preferredDns);
        requestData.append('alternativeDns', staticData.alternativeDns);

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: requestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', requestOptions);
            const jsonData = await response.json();

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));
            
            if (jsonData.status === 'Success') {
                NotificationManager.success(jsonData.message, 'Success', 1500);
            }
            else {
                NotificationManager.error('Error storing connection', 'Error', 1500);
            }
        } catch (err) {
            NotificationManager.error('Error on WiFi store request', 'Error', 1500);
        }
    }

    setWifiRequestData = (requestType, includeStatic) => {
        const wifiRequestData = new URLSearchParams();
        wifiRequestData.append('type', requestType);
        wifiRequestData.append('ssid', this.state.ssid);
        wifiRequestData.append('password', this.state.password);
        wifiRequestData.append('encryption', this.state.encryption);
        wifiRequestData.append('priority', (requestType === 'wifiDataConnect') ? 2 : 1);
        wifiRequestData.append('includeStatic', includeStatic);

        return wifiRequestData;
    }

    checkRequestData = (staticData) => {
        if (this.state.ssid === '') {
            NotificationManager.warning('SSID field not set', 'Warning', 1500);
            return false;
        }

        if (this.state.encryption !== 'OPEN' && this.state.password === '') {
            NotificationManager.warning('Password field not set', 'Warning', 1500);
            return false;
        }

        if (this.state.encryption === '' || this.state.encryption === 'default') {
            NotificationManager.warning('Encryption field not set', 'Warning', 1500);
            return false;
        }

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

    processWifiConnectionResult = async (result, includeStatic) => {
        if (result.netService !== 'OK') {
            NotificationManager.error('Networking service restart error', 'Error', 1500);
        }

        else {
            NotificationManager.success('Networking service restart successful', 'Success', 1500)

            const availability = await this.checkNetworkAvailability(result.connId, includeStatic);

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));

            availability.ipAddress !== 'Not connected'
            ? NotificationManager.success(`Connected to WiFi network ${this.state.ssid}\n IP Address: ${availability.ipAddress}`)
            : NotificationManager.error(`Can't connect to WiFi network ${this.state.ssid}`, 'Error', 1500);

            availability.ping.googleStatus === 'Ping success'
            ? NotificationManager.success('Google DNS reached', 'Success', 1500)
            : NotificationManager.error('Can\'t reach Google DNS', 'Error', 1500);

            availability.ping.screensStatus === 'Ping success'
            ? NotificationManager.success('Screens server reached', 'Success', 1500)
            : NotificationManager.error('Can\'t reach Screens server', 'Error', 1500);

            if(availability.ipAddress !=='Not connected' && availability.ping.googleStatus === 'Ping success' && availability.ping.screensStatus === 'Ping success'){
                this.handleBackButtonClick()
            }
        }
    }

    checkNetworkAvailability = async (connId, includeStatic) => {
        const checkNetworkRequestData = new URLSearchParams();
        checkNetworkRequestData.append('type', 'wifiNetworkCheck');
        checkNetworkRequestData.append('id', connId);
        checkNetworkRequestData.append('ssid', this.state.ssid);
        checkNetworkRequestData.append('includeStatic', includeStatic);

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

    handleStaticIPButtonClick = () => {
        this.setState(prevState => ({
            displayStaticIPForm: !prevState.displayStaticIPForm
        }));
    }

    handleChangeCountryButtonClick = () => {
        this.setState(prevState => ({
            displayChangeLocaleForm: !prevState.displayChangeLocaleForm
        }));
    }

    handleBackButtonClick = () => {
        this.props.onBack();
    }

    renderSpinner = () => {
        return this.state.showSpinner ? <Spinner /> : null;
    }

    renderFormBody = () => {
        if (this.state.displayStaticIPForm) {
            return this.renderStaticIPForm();
        }
        else if (this.state.displayChangeLocaleForm) {
            return this.renderChangeLocaleForm();
        }
        else {
            return this.renderWifiForm();
        }
    }

    renderWifiForm = () => {
        return (
            <Fragment>
                <div className="row mb-3">
                    <div className="offset-md-2 col-md-4">
                        <h1 className="text-white text-uppercase">WiFi Setup</h1>
                    </div>
                </div>
                <form className="mb-5">
                    <div className="form-group row">
                        <label htmlFor="wifi-ssid" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Ssid:</label>
                        {this.renderSSIDInput()}
                    </div>
                    <div className="form-group row">
                        <label htmlFor="wifi-password" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Password:</label>
                        <div className="col-sm-6 icon-field">
                            <input type={this.determinePasswordInputType()} className="form-control network-form-input" id="wifi-password" name="password" value={this.state.password} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                            {this.renderPasswordToggler()}
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="wifi-encryption" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Encryption type:</label>
                        <div className="col-sm-6">
                            <div className="dropdown">
                                <button className="form-control network-form-input text-left dropdown-toggle" type="button" id="wifi-encryption" data-toggle="dropdown" disabled={this.isEncryptionSelectDisabled()}>
                                    {this.state.encryption}
                                </button>
                                <div className="dropdown-menu" aria-labelledby="wifi-encryption">
                                    <a className="dropdown-item" href="#">Select type</a>
                                    {this.renderEncryptionTypeOptions()}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
                {this.renderOptionsButtons()}
            </Fragment>
        );
    }

    renderSSIDInput = () => {
        return this.state.ssidInputType === 'text'
            ? (
                <div className="col-sm-6 icon-field">
                    <input type="text" className="form-control network-form-input" id="wifi-ssid" name="ssid" value={this.state.ssid} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                    {this.renderSSIDToggler()}
                </div>
            )
            : (
                <div className="col-sm-6 icon-field">
                    <div className="dropdown">
                        <button className="form-control network-form-input text-left dropdown-toggle" type="button" id="wifi-ssid" data-toggle="dropdown">
                            {this.state.ssidSelectText}
                        </button>
                        <div className="dropdown-menu" aria-labelledby="wifi-ssid">
                            <a className="dropdown-item" href="#">Select network</a>
                            {this.renderSSIDOptions()}
                        </div>
                    </div>
                    {this.renderSSIDToggler()}
                </div>
            )
    }

    renderSSIDToggler = () => {
        return this.state.ssidInputType === 'text'
            ? (
                <span className="input-icon text-white" onClick={this.toggleSSIDInputType}>
                    <i className="fa fa-list-ul fa-lg"></i>
                </span>
            )
            : (
                <span className="input-icon text-white" onClick={this.toggleSSIDInputType}>
                    <i className="fa fa-font fa-lg"></i>
                </span>
            )
    }

    toggleSSIDInputType = () => {
        this.setState(prevState => {
            if (prevState.ssidInputType === 'text') {
                return { ssidInputType: 'select' }
            }
            else {
                return { ssidInputType: 'text' }
            }
        });
    }

    renderSSIDOptions = () => {
        if (isString(this.props.network.wifiNetworks)) {
            return <a className="dropdown-item" href="#">{this.props.network.wifiNetworks}</a>;
        }

        return this.props.network.wifiNetworks.map(network => {
            return <a className="dropdown-item" key={network.mac} href="#" onClick={() => {this.handleSSIDChange(network)}}>
                {`${network.ssid} - Quality: ${network.quality}`}
            </a>
        });
    }

    determinePasswordInputType = () => {
        return this.state.showPassword ? 'text' : 'password';
    }

    renderPasswordToggler = () => {
        return this.state.showPassword
            ? (
                <span className="input-icon text-white" onClick={this.togglePasswordVisibility}>
                    <i className="fa fa-eye fa-lg"></i>
                </span>
            )
            : (
                <span className="input-icon text-white" onClick={this.togglePasswordVisibility}>
                    <i className="fa fa-eye-slash fa-lg"></i>
                </span>
            )
    }

    togglePasswordVisibility = () => {
        this.setState(prevState => ({
            showPassword: !prevState.showPassword
        }));
    }

    isEncryptionSelectDisabled = () => {
        return (this.state.ssidInputType === 'select' && this.state.encryption !== '') ? true : false;
    }

    renderEncryptionTypeOptions = () => {
        return encryptionTypes.map(type => {
            return <a className="dropdown-item" key={type} href="#" onClick={() => {this.handleEncryptionChange(type)}}>{type}</a>;
        });
    }

    renderOptionsButtons = () => {
        return (
            <div className="row mt-3 justify-content-center">
                <button type="button" className="btn btn-secondary mr-2" onClick={this.handleConnectButtonClick} disabled={this.state.showSpinner}>Connect</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleStoreButtonClick} disabled={this.state.showSpinner}>Store</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleStaticIPButtonClick} disabled={this.state.showSpinner}>Static IP</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleChangeCountryButtonClick} disabled={this.state.showSpinner}>Change country</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleBackButtonClick} disabled={this.state.showSpinner}>Back</button>
            </div>
        );
    }

    renderStaticIPForm = () => {
        return <StaticIPFormComponent type={'WiFi'}
                    parentData={this.state}
                    onConnect={this.handleConnectWithStaticData}
                    onStore={this.handleStoreWithStaticData}
                    onBack={this.handleStaticIPButtonClick} />;
    }

    renderChangeLocaleForm = () => {
        return <ChangeLocaleFormComponent onBack={this.handleChangeCountryButtonClick}/>;
    }

    renderKeyboard = () => {
        return this.state.displayStaticIPForm === false && this.state.displayChangeLocaleForm === false
        ? (
            <div className="keyboard-container">
                <Keyboard ref={this.keyboard} 
                        layoutName={this.state.keyboard.layout}
                        inputName={this.state.keyboard.activeInput}
                        onKeyPress={this.handleKeyboardButtonClick}
                        onChange={this.handleKeyboardInputChange}/>
            </div>
        )
        : null
    }

    render() {
        return (
            <Fragment>
                {this.renderSpinner()}
                {this.renderFormBody()}
                {this.renderKeyboard()}
            </Fragment>
        );
    }
}

export default WifiFormComponent;