import setResult from '../../setResult';
import {buildUrl} from '../../../urlBuilder';

export default options => {
    const renderContext = options.data.root.renderContext;
    const currentResource = options.data.root.currentResource;

    const url = buildUrl(options.hash, renderContext, currentResource);

    if (url) {
        return setResult(url, this, options);
    }
};
