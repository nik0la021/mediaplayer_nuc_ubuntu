import React from 'react';

class MessagesComponent extends React.Component {
    renderRegistrationMessage = () => {
        if (!this.props.isSetupMode) {
            return (
                <div className="col-12">
                    <h1 className="text-danger text-center display-4">
                        {this.determineRegistrationMessage()}
                    </h1>
                </div>
            );
        }
        else {
            return null;
        }
    }

    determineRegistrationMessage = () => {
        if (this.props.registration.name === 'Not set' || this.props.registration.company === 'Not set') {
            return 'Company not set';
        }
        else if (this.props.registration.name.indexOf('No connection')>-1 || this.props.registration.company.indexOf('No connection')>-1) {
            return 'No connection, can\'t check company info';
        }
        else if (this.props.registration.name.indexOf('No server connection')>-1 || this.props.registration.company.indexOf('No server connection')>-1) {
            return "No server connection";
        }
    }

    render() {
        return (
            <div className="row mt-3">
                <div className="col-12">
                    <h1 className="text-white text-center display-3">
                        CODE: {this.props.code}
                    </h1>
                </div>
                {this.renderRegistrationMessage()}
            </div>
        );
    }
}

export default MessagesComponent;