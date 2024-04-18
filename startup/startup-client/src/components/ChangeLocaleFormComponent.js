import React, {Fragment} from 'react';
import {NotificationManager} from 'react-notifications';
import Keyboard from 'react-simple-keyboard';

import Spinner from './Spinner';

class ChangeLocaleFormComponent extends React.Component {
    constructor(props) {
        super(props);

        this.keyboard = React.createRef();
        this.state = {
            locale: '',
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

    handleSetCodeButtonClick = async () => {
        const isValid = this.checkRequestData();
        if (!isValid) {
            return;
        }

        const changeLocaleRequestData = new URLSearchParams();
        changeLocaleRequestData.append('type', 'changeLocale');
        changeLocaleRequestData.append('locale', this.state.locale);

        const changeLocaleRequestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: changeLocaleRequestData
        }

        this.setState(prevState => ({
            showSpinner: !prevState.showSpinner
        }));

        try {
            const response = await fetch('http://localhost:8080', changeLocaleRequestOptions);
            const jsonData = await response.json();

            this.setState(prevState => ({
                showSpinner: !prevState.showSpinner
            }));

            if (jsonData.status === 'Success') {
                NotificationManager.success(jsonData.message, 'Success', 1500);
            }
            else {
                NotificationManager.error('Error changing country code', 'Error', 1500);
            }
        } catch (err) {
            NotificationManager.error('Error on change country code request', 'Error', 1500);
        }
    }

    checkRequestData = () => {
        if (this.state.locale === '') {
            NotificationManager.warning('Locale field not set', 'Warning', 1500);
            return false;
        }

        return true;
    }

    handleBackButtonClick = () => {
        this.props.onBack();
    }

    renderSpinner = () => {
        return this.state.showSpinner ? <Spinner /> : null;
    }

    renderOptionsButtons = () => {
        return (
            <div className="row mt-3 justify-content-center">
                <button type="button" className="btn btn-secondary mr-2" onClick={this.handleSetCodeButtonClick} disabled={this.state.showSpinner}>Set Code</button>
                <button type="button" className="btn btn-secondary mx-2" onClick={this.handleBackButtonClick} disabled={this.state.showSpinner}>Back</button>
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
                {this.renderSpinner()}
                <div className="row mb-3">
                    <div className="offset-md-2 col-md-6">
                        <h2 className="text-white text-uppercase">Set country code</h2>
                    </div>
                </div>
                <form className="mb-5">
                    <div className="form-group row">
                        <label htmlFor="locale" className="offset-md-2 col-sm-2 col-form-label text-white text-uppercase">Country Code:</label>
                        <div className="col-sm-6">
                            <input type="text" className="form-control network-form-input" id="locale" name="locale" value={this.state.locale} onChange={this.handleInputChange} onFocus={this.handleActiveInputChange}/>
                        </div>
                    </div>
                </form>
                {this.renderOptionsButtons()}
                {this.renderKeyboard()}
            </Fragment>
        );
    }
}

export default ChangeLocaleFormComponent;