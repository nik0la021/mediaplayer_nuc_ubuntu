import React, {Fragment} from 'react';
import Keyboard from 'react-simple-keyboard';

class StaticIPFormComponent extends React.Component {
    constructor(props) {
        super(props);

        this.keyboard = React.createRef();
        this.state = {
            ipAddress: '',
            subnetMask: '',
            defaultGateway: '',
            preferredDns: '',
            alternativeDns: '',
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

    handleConnectButtonClick = () => {
        this.props.onConnect(this.state);
    }

    handleStoreButtonClick = () => {
        this.props.onStore(this.state);
    }

    handleBackButtonClick = () => {
        this.props.onBack();
    }

    renderOptionsButtons = () => {
        return (
            <div className="row mt-3 justify-content-center">
                <button type="button" className="btn btn-secondary mr-2" onClick={this.handleConnectButtonClick} disabled={this.props.showSpinner}>Connect</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleStoreButtonClick} disabled={this.props.showSpinner}>Store</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleBackButtonClick} disabled={this.props.showSpinner}>Back</button>
            </div>
        );
    }

    renderKeyboard = () => {
        return (
            <div className="keyboard-container">
                <Keyboard ref={this.keyboard} 
                        layoutName={this.state.keyboard.layout}
                        inputName={this.state.keyboard.activeInput}
                        onKeyPress={this.handleKeyboardButtonClick}
                        onChange={this.handleKeyboardInputChange}/>
            </div>
        );
    }

    render() {
        return (
            <Fragment>
                <div className="row mb-3">
                    <div className="offset-md-2 col-md-6">
                        <h2 className="text-white text-uppercase">{this.props.type} Static IP Setup</h2>
                    </div>
                </div>
                <form className="mb-5">
                    <div className="form-group row">
                        <label htmlFor="static-ip-address" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">IP Address</label>
                        <div className="col-sm-6">
                            <input type="text" className="form-control network-form-input" id="static-ip-address" name="ipAddress" value={this.state.ipAddress} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="static-subnet-mask" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Subnet Mask</label>
                        <div className="col-sm-6">
                            <input type="text" className="form-control network-form-input" id="static-subnet-mask" name="subnetMask" value={this.state.subnetMask} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="static-default-gateway" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Default Gateway</label>
                        <div className="col-sm-6">
                            <input type="text" className="form-control network-form-input" id="static-default-gateway" name="defaultGateway" value={this.state.defaultGateway} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="static-preferred-dns" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Preferred DNS</label>
                        <div className="col-sm-6">
                            <input type="text" className="form-control network-form-input" id="static-preferred-dns" name="preferredDns" value={this.state.preferredDns} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                        </div>
                    </div>
                    <div className="form-group row">
                        <label htmlFor="static-alternative-dns" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Alternative DNS</label>
                        <div className="col-sm-6">
                            <input type="text" className="form-control network-form-input" id="static-alternative-dns" name="alternativeDns" value={this.state.alternativeDns} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                        </div>
                    </div>
                </form>
                {this.renderOptionsButtons()}
                {this.renderKeyboard()}
            </Fragment>
        );
    }
}

export default StaticIPFormComponent;