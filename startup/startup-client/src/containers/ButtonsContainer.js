import React from 'react';
import {NotificationManager} from 'react-notifications';

class ButtonsContainer extends React.Component {

    handleNetworkTypeButtonClick = (event) => {
        this.props.onFormChange(event.target.innerHTML);
    }

    handleRestartButtonClick = async () => {
        const restartRequestData = new URLSearchParams();
        restartRequestData.append('type', 'restart');

        const restartRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: restartRequestData
        }

        try {
            const response = await fetch('http://localhost:8080', restartRequestOptions);
            const jsonData = await response.json();
            NotificationManager.info(jsonData.status, 'Info', 1500);
        } catch (err) {
            NotificationManager.error('Error on restart', 'Error', 1500);
        }
    }

    handleDeleteContent = async () => {
        const deleteContentRequestData = new URLSearchParams();
        deleteContentRequestData.append('type', 'deleteContent');

        const deleteContentRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: deleteContentRequestData
        }

        try {
            const response = await fetch('http://localhost:8080', deleteContentRequestOptions);
            const jsonData = await response.json();
            NotificationManager.info(jsonData.status, jsonData.message, 1500);
        } catch (err) {
            NotificationManager.error('Error delete content', 'Error', 1500);
        }
    }

    renderOptionsButtons = () => {
        return (
            <div className="row mt-3 justify-content-center">
                <button type="button" className="btn btn-secondary mr-2" onClick={this.handleNetworkTypeButtonClick} disabled={!this.props.isDataLoaded}>WiFi</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleNetworkTypeButtonClick} disabled={!this.props.isDataLoaded}>Ethernet</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleNetworkTypeButtonClick} disabled={!this.props.isDataLoaded}>Stored Connections</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleDeleteContent} disabled={!this.props.isDataLoaded}>Delete stored content</button>
                <button type="button" className="btn btn-secondary ml-2" onClick={this.handleRestartButtonClick} disabled={!this.props.isDataLoaded}>Restart</button>
            </div>
        );
    }

    renderSetupButton = () => {
        return (
            <div className="row mt-3">
                <button type="button" className="btn btn-secondary btn-lg mx-auto" onClick={this.props.handleSetupButtonClick}>
                    SETUP
                </button>
            </div>
        );
    }

    render() {
        return (
            this.props.isSetupMode
                ? this.renderOptionsButtons()
                : this.renderSetupButton()
        );
    }
}

export default ButtonsContainer;