import { FormGroup, Label } from '@adminjs/design-system';
import React from 'react';
import File from './file.js';
const Show = (props) => {
    const { property } = props;
    return (React.createElement(FormGroup, null,
        React.createElement(Label, null, property.label),
        React.createElement(File, { width: "100%", ...props })));
};
export default Show;
